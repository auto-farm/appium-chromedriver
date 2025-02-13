import {fs, mkdirp} from '@appium/support';
import ChromedriverStorageClient from './storage-client';
import {CD_CDN, CD_VER, retrieveData, getChromedriverDir, OS, X64} from './utils';

const DOWNLOAD_TIMEOUT_MS = 15 * 1000;
const LATEST_VERSION = 'LATEST';
/**
 *
 * @param {string} ver
 */
async function formatCdVersion(ver) {
  return ver === LATEST_VERSION
    ? (
        await retrieveData(
          `${CD_CDN}/LATEST_RELEASE`,
          {
            'user-agent': 'appium',
            accept: '*/*',
          },
          {timeout: DOWNLOAD_TIMEOUT_MS}
        )
      ).trim()
    : ver;
}

/**
 *
 * @param {string} platformName
 */
async function prepareChromedriverDir(platformName) {
  const chromedriverDir = getChromedriverDir(platformName);
  if (!(await fs.exists(chromedriverDir))) {
    await mkdirp(chromedriverDir);
  }
  return chromedriverDir;
}

async function install() {
  const osInfo = {name: OS.windows, arch: X64};
  const client = new ChromedriverStorageClient({
    chromedriverDir: await prepareChromedriverDir(osInfo.name),
  });
  await client.syncDrivers({
    osInfo,
    versions: [await formatCdVersion(CD_VER)],
  });
}

async function doInstall() {
  await install();
}

export {install, doInstall};
