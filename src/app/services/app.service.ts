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

import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Injectable, OnDestroy} from '@angular/core';
import {Network} from '@ionic-native/network/ngx';
import {ReplaySubject, Subscription} from 'rxjs';
import {AlertController, LoadingController, Platform, } from '@ionic/angular';
import {Storage} from '@ionic/storage';
import {UserModel} from '../models/user.model';
import {PlatformType} from '../models/platform-type';
import {NetworkType} from '../models/network-type';
import {Router} from '@angular/router';
import {Utils} from '../utils/utils';
import {LogProvider} from './ionic-log-file-appender/log.service';
import {OverlayBaseController} from '@ionic/angular/dist/util/overlay';

@Injectable()
export class AppService implements OnDestroy {
  base = 'http://192.168.0.214:8081/cb';
  token: string;
  offlineLoggedIn = false;
  currentUser: UserModel;

  networkAvailable: ReplaySubject<boolean> = new ReplaySubject<boolean>(1);
  onConnectSub: Subscription;
  onDisconnectSub: Subscription;
  loginSub: Subscription;

  constructor(private http: HttpClient,
              private network: Network,
              private platform: Platform,
              private storage: Storage,
              private router: Router,
              private loadingCtrl: LoadingController,
              private alertCtrl: AlertController,
              private logger: LogProvider) {
    this.initialize();
  }

  ngOnDestroy() {
    if (this.onConnectSub) {
      this.onConnectSub.unsubscribe();
    }
    if (this.onDisconnectSub) {
      this.onDisconnectSub.unsubscribe();
    }
    if (this.loginSub) {
      this.loginSub.unsubscribe();
    }
  }

  get(url: string, accept = 'application/json'): Promise<any> {
    return this.http.get(this.base + '/' + url, {
      headers: this.getHeaders(accept),
      withCredentials: true
    }).toPromise().catch(err => {
      return AppService.handleError(err);
    });
  }

  post(url: string, param?: any, accept = 'application/json'): Promise<any> {
    return this.http.post(this.base + '/' + url, param, {
      headers: this.getHeaders(accept),
      withCredentials: true
    }).toPromise().catch(err => {
      return AppService.handleError(err);
    });
  }

  cancelLogin() {
    if (this.loginSub) {
      this.clearLoginSubscription();
    }
  }

  login(userName: string, password: string): Promise<boolean> {
    if (this.loginSub) {
      this.clearLoginSubscription();
      return this.login(userName, password);
    }

    const basicAuthToken = btoa(`${userName}:${password}`);
    this.logger.log('Created basic auth token from username and password.');
    let headers = this.getHeaders('application/json');
    headers = headers.append('Authorization', `Basic ${basicAuthToken}`);

    return new Promise((resolve, reject) => {
      this.logger.log('Sending request to /rest/jwt/authenticate with auth header!');
      this.http.get(`${this.base}/rest/jwt/authenticate`, {
        headers
      }).subscribe((response: { user: UserModel, token: string } | ErrorVO) => {
        this.logger.log(`Response for /rest/jwt/authenticate: [${JSON.stringify(response)}]`);
        if (response && !(response instanceof ErrorVO)) {
          this.currentUser = response.user;
          this.token = response.token;
          this.logger.log('Current user and token has been set according to the response.');
          this.saveTokenWithServerUrl().then(() => {
            this.offlineLoggedIn = false;
            resolve(true);
          });
        } else {
          this.logger.err('An error occurred during /rest/jwt/authenticate! Clearing current token.');
          this.token = null;
          resolve(false);
        }
        this.clearLoginSubscription();
      }, err => {
        this.logger.err('An error occurred during /rest/jwt/authenticate!', err);
        reject(AppService.handleError(err));
        this.clearLoginSubscription();
      });
    });
  }

  async logout() {
    this.token = null;
    await this.storage.remove('token');
    await this.storage.remove('serverUrl');
    this.currentUser = null;
    await this.router.navigateByUrl('/login');
  }

  async checkSessionToken(): Promise<boolean> {
    const token = await this.storage.get('token');
    this.logger.log(`Obtained saved token from storage: [${token}]`);
    if (!token) {
      return false;
    }
    const base = await this.storage.get('serverUrl');
    this.logger.log(`Obtained saved server URL from storage: [${base}]`);
    if (base) {
      this.base = base;
    }
    this.token = token;
    this.logger.log('Server base URL and token has been set in app service!');
    return this.loadUserInfo(false);
  }

  async finishSSOLogin(authData: {user: UserModel, token: string}) {
    this.logger.log(`Setting token after successful SSO login: [${authData.token}]`);
    this.token = authData.token;
    try {
      await this.saveTokenWithServerUrl();
    } catch (err) {
      const errorMessage = 'Failed to save token with server url into store!';
      this.logger.err(errorMessage, err);
      await this.notifyUserAboutError(errorMessage);
      throw err;
    }
    this.logger.log(`Setting current user after successful SSO login: [${JSON.stringify(authData.user)}]`);
    this.currentUser = authData.user;
  }

  async loadUserInfo(showErrorPopup: boolean = true): Promise<boolean> {
    const response: UserModel | ErrorVO = await this.get('rest/user/self');
    this.logger.log(`Response of /rest/user/self: [${JSON.stringify(response)}]`);
    if (response && !(response instanceof ErrorVO)) {
      this.currentUser = {id: Utils.uri2id(response.uri), ...response};
      this.logger.log(`Current user has been set to: [${JSON.stringify(this.currentUser)}]`);
      return true;
    } else if (response && (response instanceof ErrorVO)) {
      this.logger.err('Error occurred during getting user info, clearing currently set token!', response);
      if (showErrorPopup) {
        await this.handleServerRequestFail('Server request failed', response.errorMessage, null);
      }
      this.token = null;
      return false;
    }
  }

  async notifyUserAboutError(errorMessage: string, throwError?: boolean) {
    await this.dismissLoadersAndAlertsSilently();
    const alert = await this.alertCtrl.create({
      header: 'An error occurred!',
      subHeader: errorMessage,
    });
    await alert.present();
    if (throwError) {
      throw new Error(errorMessage);
    }
  }

  async handleServerRequestFail(header: string, subHeader: string, buttons: { text: string, handler: () => void }[]) {
    await this.dismissLoadersAndAlertsSilently();
    const alert = await this.alertCtrl.create({
      header,
      subHeader,
      buttons,
    });
    await alert.present();
  }

  private async dismissLoadersAndAlertsSilently() {
    await this.dismissOverlaySilently(this.loadingCtrl);
    await this.dismissOverlaySilently(this.alertCtrl);
  }

  private async dismissOverlaySilently(overlayController: OverlayBaseController<any, any>) {
    if (!overlayController) {
      return;
    }
    let overlay = await overlayController.getTop();
    while (overlay) {
      try {
        await overlayController.dismiss();
      } catch (err) {
        // ignore
      }
      overlay = await overlayController.getTop();
    }
  }

  private initialize() {
    if (this.platform.is(PlatformType.CORDOVA)) {
      this.networkAvailable.next(this.network.type !== NetworkType.UNKNOWN && this.network.type !== NetworkType.NONE);
      this.onConnectSub = this.network.onConnect().subscribe(info => {
        this.networkAvailable.next(true);
      });
      this.onDisconnectSub = this.network.onDisconnect().subscribe(info => {
        this.networkAvailable.next(false);
      });
    } else {
      this.networkAvailable.next(true);
    }
  }

  private static handleError(error: any): ErrorVO {
    let errMsg: string;
    if (error.status === 401) {
      errMsg = 'Unauthorized!';
    }
    if (error.status === 510) {
      const body = error.json();
      errMsg = body.message;
    }
    if (!errMsg) {
      if (error._body) {
        if ((JSON.parse(error._body).message).indexOf(':') !== -1) {
          errMsg = (JSON.parse(error._body).message).split(':')[1];
          errMsg = errMsg.split(';')[0];
        } else {
          errMsg = (JSON.parse(error._body).message).split(';')[0];
        }
      }
    }
    if (!errMsg) {
      errMsg = (error.error && error.error.message) ? error.error.message :
        error.status ? `${error.status} - ${error.statusText}` : 'Server error';
    }
    return new ErrorVO(errMsg, error.status);
  }

  private getHeaders(accept): HttpHeaders {
    let headers: HttpHeaders = new HttpHeaders();
    headers = headers.append('Content-Type', 'application/json');
    headers = headers.append('Accept', accept);
    return headers;
  }

  private async saveTokenWithServerUrl(): Promise<void> {
    this.logger.log(`Saving current token [${this.token}] and server URL [${this.base}] to storage!`);
    await this.storage.set('token', this.token);
    await this.storage.set('serverUrl', this.base);
    this.logger.log('Token and server URL save was successful!');
  }

  private clearLoginSubscription() {
    if (this.loginSub) {
      this.logger.log('Unsubscribing from login request.');
      this.loginSub.unsubscribe();
      this.loginSub = null;
    }
  }
}

export class ErrorVO {
  status: string;
  errorMessage: string;

  constructor(errorMessage: string, status?: string) {
    this.errorMessage = errorMessage;
    this.status = status;
  }
}
