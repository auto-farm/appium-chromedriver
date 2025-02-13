import {Chromedriver} from '../../lib/chromedriver';
import * as utils from '../../lib/utils';
import sinon from 'sinon';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {PROTOCOLS} from '@appium/base-driver';
import {fs} from '@appium/support';
import * as tp from 'teen_process';
import path from 'path';
import _ from 'lodash';

chai.should();
chai.use(chaiAsPromised);

describe('chromedriver', function () {
  let sandbox;
  beforeEach(function () {
    sandbox = sinon.createSandbox();
  });
  afterEach(function () {
    sandbox.restore();
  });

  describe('getCompatibleChromedriver', function () {
    describe('desktop', function () {
      it('should find generic binary', async function () {
        sandbox.stub(utils, 'getChromedriverBinaryPath').returns('/path/to/chromedriver');

        const cd = new Chromedriver({});
        const binPath = await cd.getCompatibleChromedriver();
        binPath.should.eql('/path/to/chromedriver');
      });
    });

    describe('Android', function () {
      let cd;
      let getChromedriverBinaryPathSpy;
      before(function () {
        cd = new Chromedriver({
          adb: {
            getApiLevel: () => 25,
          },
        });
      });
      beforeEach(function () {
        getChromedriverBinaryPathSpy = sandbox.spy(utils, 'getChromedriverBinaryPath');
      });
      afterEach(function () {
        getChromedriverBinaryPathSpy.called.should.be.false;
      });

      it('should find a compatible binary if only one binary exists', async function () {
        sandbox.stub(utils, 'getChromeVersion').returns('63.0.3239.99');
        sandbox.stub(fs, 'glob').returns(['/path/to/chromedriver']);
        sandbox.stub(tp, 'exec').returns({
          stdout: 'ChromeDriver 2.36.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
        });

        const binPath = await cd.getCompatibleChromedriver();
        binPath.should.eql('/path/to/chromedriver');
      });

      it('should find most recent compatible binary for older driver versions', async function () {
        sandbox.stub(utils, 'getChromeVersion').returns('70.0.3029.42');
        sandbox
          .stub(fs, 'glob')
          .returns([
            '/path/to/chromedriver-36',
            '/path/to/chromedriver-35',
            '/path/to/chromedriver-34',
            '/path/to/chromedriver-33',
            '/path/to/chromedriver-32',
            '/path/to/chromedriver-31',
            '/path/to/chromedriver-30',
          ]);
        sandbox
          .stub(tp, 'exec')
          .onCall(0)
          .returns({
            stdout: 'ChromeDriver 2.36.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(1)
          .returns({
            stdout: 'ChromeDriver 2.35.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(2)
          .returns({
            stdout: 'ChromeDriver 2.34.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(3)
          .returns({
            stdout: 'ChromeDriver 2.33.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(4)
          .returns({
            stdout: 'ChromeDriver 2.32.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(5)
          .returns({
            stdout: 'ChromeDriver 2.31.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(6)
          .returns({
            stdout: 'ChromeDriver 2.30.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          });

        const binPath = await cd.getCompatibleChromedriver();
        binPath.should.eql('/path/to/chromedriver-36');
      });

      it('should correctly determine Chromedriver versions', async function () {
        sandbox
          .stub(fs, 'glob')
          .returns([
            '/path/to/chromedriver-74.0.3729.6',
            '/path/to/chromedriver-36',
            '/path/to/chromedriver-35',
            '/path/to/chromedriver-34',
            '/path/to/chromedriver-33',
            '/path/to/chromedriver-32',
            '/path/to/chromedriver-31',
            '/path/to/chromedriver-30',
          ]);
        sandbox
          .stub(tp, 'exec')
          .onCall(0)
          .returns({
            stdout: 'ChromeDriver 74.0.3729.6 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(1)
          .returns({
            stdout: 'ChromeDriver 2.36.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(2)
          .returns({
            stdout: 'ChromeDriver 2.35.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(3)
          .returns({
            stdout: 'ChromeDriver 2.34.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(4)
          .returns({
            stdout: 'ChromeDriver 2.33.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(5)
          .returns({
            stdout: 'ChromeDriver 2.32.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(6)
          .returns({
            stdout: 'ChromeDriver 2.31.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(7)
          .returns({
            stdout: 'ChromeDriver 2.30.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          });

        const chromedrivers = await cd.getChromedrivers(utils.CHROMEDRIVER_CHROME_MAPPING);
        for (const [cd, expectedVersion] of _.zip(chromedrivers, [
          '74.0.3729.6',
          '2.36',
          '2.35',
          '2.34',
          '2.33',
          '2.32',
          '2.31',
          '2.30',
        ])) {
          cd.version.should.eql(expectedVersion);
          cd.minChromeVersion.should.to.not.be.null;
        }
      });

      it('should fail when chrome is too new', async function () {
        sandbox.stub(utils, 'getChromeVersion').returns('10000.0.0.42');
        sandbox
          .stub(fs, 'glob')
          .returns([
            '/path/to/chromedriver-9000',
            '/path/to/chromedriver-8999',
            '/path/to/chromedriver-36',
            '/path/to/chromedriver-35',
          ]);
        sandbox
          .stub(tp, 'exec')
          .onCall(0)
          .returns({
            stdout: 'ChromeDriver 2.9000.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(1)
          .returns({
            stdout: 'ChromeDriver 2.8999.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(2)
          .returns({
            stdout: 'ChromeDriver 2.36.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          })
          .onCall(3)
          .returns({
            stdout: 'ChromeDriver 2.35.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
          });

        await cd.getCompatibleChromedriver().should.eventually.be.rejected;
      });

      it('should search specified directory if provided', async function () {
        const cd = new Chromedriver({
          adb: {
            getApiLevel: () => 25,
          },
          executableDir: '/some/local/dir/for/chromedrivers',
        });

        sandbox.stub(utils, 'getChromeVersion').returns('63.0.3239.99');
        sandbox.stub(fs, 'glob').returns(['/some/local/dir/for/chromedrivers/chromedriver']);
        sandbox.stub(tp, 'exec').returns({
          stdout: 'ChromeDriver 2.36.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
        });

        const binPath = await cd.getCompatibleChromedriver();
        binPath.should.eql('/some/local/dir/for/chromedrivers/chromedriver');
      });

      it('should use alternative mapping if provided', async function () {
        const cd = new Chromedriver({
          adb: {
            getApiLevel: () => 25,
          },
          mappingPath: path.resolve(__dirname, '..', 'fixtures', 'alt-mapping.json'),
        });

        sandbox.stub(utils, 'getChromeVersion').returns('63.0.3239.99');
        sandbox.stub(fs, 'glob').returns(['/path/to/chromedriver-42']);
        sandbox.stub(tp, 'exec').returns({
          stdout: 'ChromeDriver 2.42.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
        });

        const binPath = await cd.getCompatibleChromedriver();
        binPath.should.eql('/path/to/chromedriver-42');
      });

      it('should use alternative mapping if provided even if semver is broken', async function () {
        const cd = new Chromedriver({
          adb: {
            getApiLevel: () => 25,
          },
          mappingPath: path.resolve(__dirname, '..', 'fixtures', 'alt-mapping-nonsemver.json'),
        });

        sandbox.stub(utils, 'getChromeVersion').returns('63.0.3239.99');
        sandbox.stub(fs, 'glob').returns(['/path/to/chromedriver-42']);
        sandbox.stub(tp, 'exec').returns({
          stdout: 'ChromeDriver 2.42.540469 (1881fd7f8641508feb5166b7cae561d87723cfa8)',
        });

        const binPath = await cd.getCompatibleChromedriver();
        binPath.should.eql('/path/to/chromedriver-42');
      });
    });
  });

  describe('detectWebDriverProtocol', function () {
    it('sync with chrome as mjsonwp', function () {
      const cd = new Chromedriver({});
      cd.desiredProtocol.should.eql(PROTOCOLS.MJSONWP);
      (cd.driverVersion === null).should.be.true;
      cd.detectWebDriverProtocol(
        'Starting ChromeDriver 2.33.506106 (8a06c39c4582fbfbab6966dbb1c38a9173bfb1a2) on port 9515'
      );
      cd.desiredProtocol.should.eql(PROTOCOLS.MJSONWP);
      cd.driverVersion.should.eql('2.33.506106');
    });

    it('sync with chrome as w3c', function () {
      const cd = new Chromedriver({});
      cd.desiredProtocol.should.eql(PROTOCOLS.MJSONWP);
      (cd.driverVersion === null).should.be.true;
      cd.detectWebDriverProtocol(
        'Starting ChromeDriver 111.0.1661.41 (8a06c39c4582fbfbab6966dbb1c38a9173bfb1a2) on port 9515'
      );
      cd.desiredProtocol.should.eql(PROTOCOLS.W3C);
      cd.driverVersion.should.eql('111.0.1661.41');
    });

    it('sync with msedge', function () {
      const cd = new Chromedriver({});
      cd.desiredProtocol.should.eql(PROTOCOLS.MJSONWP);
      (cd.driverVersion === null).should.be.true;
      cd.detectWebDriverProtocol(
        'Starting Microsoft Edge WebDriver 111.0.1661.41 (57be51b50d1be232a9e8186a10017d9e06b1fd16) on port 9515'
      );
      cd.desiredProtocol.should.eql(PROTOCOLS.W3C);
      cd.driverVersion.should.eql('111.0.1661.41');
    });

    it('sync with unknown driver', function () {
      const cd = new Chromedriver({});
      cd.desiredProtocol.should.eql(PROTOCOLS.MJSONWP);
      (cd.driverVersion === null).should.be.true;
      cd.detectWebDriverProtocol(
        'Starting Unknown WebDriver 111.0.1661.41 (57be51b50d1be232a9e8186a10017d9e06b1fd16) on port 9515'
      );
      cd.desiredProtocol.should.eql(PROTOCOLS.MJSONWP);
      (cd.driverVersion === null).should.be.true;
    });
  });

  describe('getMostRecentChromedriver', function () {
    it('should get a value by default', function () {
      utils.getMostRecentChromedriver().should.be.a.string;
    });
    it('should get the most recent version', function () {
      const mapping = {
        2.12: '36.0.1985',
        2.11: '36.0.1985',
        '2.10': '33.0.1751',
        2.9: '31.0.1650',
        2.8: '30.0.1573',
        2.7: '30.0.1573',
        2.6: '29.0.1545',
      };
      utils.getMostRecentChromedriver(mapping).should.eql('2.12');
    });
    it('should handle broken semver', function () {
      const mapping = {
        2.12: '36.0.1985',
        'v2.11': '36.0.1985',
        '2.10.0.0': '33.0.1751',
        '2.9.3-beta': '31.0.1650',
        2.8: '30.0.1573',
        2.7: '30.0.1573',
        2.6: '29.0.1545',
      };
      utils.getMostRecentChromedriver(mapping).should.eql('2.12');
    });
    it('should fail for empty mapping', function () {
      (() => utils.getMostRecentChromedriver({})).should.throw(/empty/);
    });
  });
});
