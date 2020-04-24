/**
 * Copyright 2020 Intland Software GmbH
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {Component} from '@angular/core';
import {AlertController, LoadingController, Platform} from '@ionic/angular';
import {AppService} from '../../services/app.service';
import {StorageService} from '../../services/storage.service';
import {Router} from '@angular/router';
import {InAppBrowserEvent} from '@ionic-native/in-app-browser/ngx';
import {UserModel} from '../../models/user.model';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {Entry} from '@ionic-native/file/ngx';
import {LogProvider} from '../../services/ionic-log-file-appender/log.service';

@Component({
  selector: 'page-login',
  templateUrl: 'login.html',
  styleUrls: ['./login.scss']
})
export class LoginPage {

  static CANCEL_LOGIN_INFO_DELAY = 4000;
  static LOGIN_URL_REGEX = /login\.spr/;

  userName = '';
  password = '';

  inAppBrowser: any;
  ssoLoginLoader: HTMLIonLoadingElement;

  private iabLoadErrorCallback = (params: { code: number, message: string, type: string, url: string }) => {
    this.logger.err('An error occurred during loading the requested page in the in-app browser!', params);
    this.closeInAppBrowser();
    this.loginFailed({errorMessage: params.message}, this.ssoLoginLoader).then();
  }

  private iabLoadStopCallback = (event: InAppBrowserEvent) => {
    const currentBaseRegexp = new RegExp(this.appService.base);
    if (currentBaseRegexp.test(event.url) && LoginPage.LOGIN_URL_REGEX.test(event.url)) {
      this.logger.log(
        `IAB page load stopped, URL contains server URL and login.spr: [${JSON.stringify(event)}]. Executing sso input query.`
      );
      this.inAppBrowser.executeScript({code: `document.getElementById('sso');`}, (value: any[]) => {
        if (!value || !value.length || !value[0]) {
          this.logger.log('SSO login button could not be found on loaded page!');
          this.closeInAppBrowser();
          this.loginFailed({
            errorMessage: 'SSO login is not available! Check the server URL and the server configuration!'
          }, this.ssoLoginLoader).then();
        } else {
          this.logger.log('SSO login button found! Clicking on it!');
          this.inAppBrowser.executeScript({code: `document.getElementById('sso').click();`}, () => {
            this.logger.log('Successfully clicked on SSO login button.');
          });
        }
      });
    } else if (currentBaseRegexp.test(event.url)) {
      this.logger.log(`IAB page load stopped, url does not contain login.spr but contains server URL: [${JSON.stringify(event)}]`);
      this.logger.log('Executing the jwt/authenticate.spr ajax call!');
      this.inAppBrowser.executeScript({
        code: `$.ajax({url: "jwt/authenticate.spr", async: false}).responseJSON`
      }, async (value: any[]) => {
        this.logger.log(`Result of the jwt/authenticate.spr ajax call: [${JSON.stringify(value)}]`);
        if (value && value.length && value[0]) {
          const authData = value[0] as { user: UserModel, token: string };
          this.closeInAppBrowser();
          if (!authData.user || !authData.token) {
            this.logger.err('The jwt/authenticate.spr ajax call response is invalid!');
            this.loginFailed({errorMessage: 'Login was unsuccessful!'}, this.ssoLoginLoader).then();
            return;
          }
          const loginLoader = await this.showLoginLoading();
          await this.appService.finishSSOLogin(authData);
          const loadedSuccessfully = await this.appService.loadUserInfo();
          if (!loadedSuccessfully) {
            return;
          }
          const url = await this.storageService.collectSavedProjectAndTrackerPages();
          await loginLoader.dismiss();
          if (!this.ssoLoginLoader.hidden) {
            await this.ssoLoginLoader.dismiss();
          }
          this.logger.log(`Navigating to the saved project and tracker url: [${url}]`);
          await this.router.navigateByUrl(url);
        } else {
          this.logger.err('Bad or missing result of the jwt/authenticate.spr ajax call!');
          this.closeInAppBrowser();
          this.loginFailed({errorMessage: 'SSO login was unsuccessful!'}, this.ssoLoginLoader).then();
        }
      });
    } else {
      this.logger.log(`IAB page load stopped, url does not contain login.spr nor server URL: [${JSON.stringify(event)}]`);
      if (!this.ssoLoginLoader.hidden) {
        this.logger.log('Hiding login loader, showing in app browser');
        this.ssoLoginLoader.dismiss();
        this.inAppBrowser.show();
      }
    }
  }

  constructor(public appService: AppService,
              private platform: Platform,
              private loadingCtrl: LoadingController,
              private alertCtrl: AlertController,
              private storageService: StorageService,
              private router: Router,
              private logger: LogProvider,
              private socialSharing: SocialSharing) {
  }

  get loginDisabled() {
    return !this.appService.base || !this.userName || !this.password;
  }

  ionViewDidLeave() {
    this.userName = '';
    this.password = '';
  }

  async login() {
    const formDataForLog = {
      serverUrl: this.appService.base,
      userName: this.userName,
      isPasswordFilled: !!this.password
    };
    this.logger.log(`Clicked on simple login button, form data: [${JSON.stringify(formDataForLog)}]`);
    const loader = await this.showLoginLoading();
    this.scheduleCancelLoginMessage(loader);

    try {
      this.logger.log('Trying to log in with provided username and password to the given server.');
      const success = await this.appService.login(this.userName, this.password);
      if (!success) {
        this.logger.log('Unsuccessful login!');
        await this.loginFailed(null, loader);
        return;
      }
      this.logger.log('Successful login!');
      const url = await this.storageService.collectSavedProjectAndTrackerPages();
      await loader.dismiss();

      this.logger.log(`Navigating to saved project and tracker path: [${url}]`);
      await this.router.navigateByUrl(url);
    } catch (err) {
      this.logger.err('Login unsuccessful!', err);
      this.loginFailed(err, loader);
    }
  }

  async showOfflineLoginForm() {
    this.logger.log(`Clicked on offline login button. Server address: [${this.appService.base}]`);
    const alert = await this.alertCtrl.create({
      header: 'Offline Login',
      message: 'Enter your offline login code',
      inputs: [{
        name: 'code',
        placeholder: 'Code',
        type: 'password'
      }],
      buttons: [{
        text: 'Cancel',
        handler: () => {
        }
      }, {
        text: 'Login',
        handler: data => {
          this.logger.log(`Logging in with offline code: [${data.code}]`);
          this.loginWithOfflineCode(data.code).then();
        }
      }],
      backdropDismiss: false
    });
    await alert.present();
  }

  async loginWithSSO() {
    this.logger.log(`Clicked on SSO login button. Server address: [${this.appService.base}]`);
    this.ssoLoginLoader = await this.showSSOLoading();
    this.logger.log(`Opening in app browser on URL: [${this.appService.base + '/login.spr'}]`);
    // @ts-ignore
    this.inAppBrowser = cordova.InAppBrowser.open(
      this.appService.base + '/login.spr',
      '_blank',
      'location=no,hidden=yes');
    this.inAppBrowser.addEventListener('loaderror', this.iabLoadErrorCallback);
    this.inAppBrowser.addEventListener('loadstop', this.iabLoadStopCallback);
  }

  async sendLogs() {
    this.logger.log('Clicked on send logs button.');
    try {
      await this.socialSharing.canShareViaEmail();
      this.logger.log('Social sharing allows share via e-mail!');
      const fileEntries: Entry[] = await this.logger.getLogFiles();
      this.logger.log('Successfully obtained log files!');
      const filesUrls = fileEntries.map((fe: Entry) => fe.toURL());
      this.logger.log(`Log file URLs: [${JSON.stringify(filesUrls)}]`);
      await this.socialSharing.shareViaEmail(
        'Here are the most recent log messages from the offline testing application.',
        'Offline Test Application Log Messages',
        ['adam.bertalan@retina.intland.com'],
        null,
        null,
        filesUrls
      );
    } catch (err) {
      this.logger.err('Error occurred during sharing log files via e-mail.', err);
    }
  }

  private async loginWithOfflineCode(code: string) {
    const loader = await this.loadingCtrl.create({
      message: 'Logging in offline, Please wait.',
      backdropDismiss: true
    });
    await loader.present();

    try {
      const data = await this.storageService.getOfflineLoginDataByCode(code);
      if (!data) {
        this.loginFailed('The entered code is invalid!', loader);
        return;
      }

      this.appService.currentUser = data.user;
      this.appService.base = data.base;
      this.appService.offlineLoggedIn = true;

      const url = await this.storageService.collectSavedProjectAndTrackerPages();
      await loader.dismiss();

      await this.router.navigateByUrl(url);
    } catch (err) {
      this.logger.err('Login with offline code unsuccessful!', err);
      const alert = await this.alertCtrl.create({
        header: 'Cannot send logs via e-amil',
        subHeader: 'An error occurred during collecting logs via e-mail!'
      });
      await alert.present();
    }
  }

  private async showSSOLoading(): Promise<HTMLIonLoadingElement> {
    const loader = await this.loadingCtrl.create({
      message: '<p>Loading SSO login. Please wait.</p>',
      backdropDismiss: true,
    });
    await loader.present();
    return loader;
  }

  private async showLoginLoading(): Promise<HTMLIonLoadingElement> {
    this.logger.log('Showing login loading spinner.');
    const loader = await this.loadingCtrl.create({
      message: '<p>Logging in, Please wait.</p>',
      backdropDismiss: true,
    });
    loader.onWillDismiss().then(() => {
      this.appService.cancelLogin();
    });
    await loader.present();
    return loader;
  }

  private async loginFailed(err: any, loader: HTMLIonLoadingElement) {
    const message = (err && err.errorMessage) || '';
    await loader.dismiss();
    const alert = await this.alertCtrl.create({
      header: 'Login failed',
      subHeader: message
    });
    await alert.present();
  }

  private scheduleCancelLoginMessage(loader: HTMLIonLoadingElement) {
    setTimeout(() => {
      loader.message = `<p>Logging in, Please wait.</p><br>
         <small>Login takes too long? Tap outside of this popup to cancel the login!</small>`;
    }, LoginPage.CANCEL_LOGIN_INFO_DELAY);
  }

  private closeInAppBrowser() {
    this.logger.log('Closing in app browser.');
    if (this.inAppBrowser) {
      this.inAppBrowser.close();
      this.inAppBrowser.removeEventListener('loaderror', this.iabLoadErrorCallback);
      this.inAppBrowser.removeEventListener('loadstop', this.iabLoadStopCallback);
    }
  }
}
