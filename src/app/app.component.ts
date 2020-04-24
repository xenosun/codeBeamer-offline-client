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

import {AfterViewInit, Component} from '@angular/core';
import {Platform} from '@ionic/angular';
import {StatusBar} from '@ionic-native/status-bar/ngx';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {AppService} from './services/app.service';
import {PlatformType} from './models/platform-type';
import {StorageService} from './services/storage.service';
import {Router} from '@angular/router';
import {LogProvider} from './services/ionic-log-file-appender/log.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class MyApp implements AfterViewInit {

  constructor(private platform: Platform,
              private statusBar: StatusBar,
              private splashScreen: SplashScreen,
              private appService: AppService,
              private storageService: StorageService,
              private router: Router,
              private logger: LogProvider) {
    this.initialize().then();
  }

  async initialize() {
    await this.platform.ready();
    if (this.platform.is(PlatformType.CORDOVA)) {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      await this.logger.init({
        logToConsole: true,
      });
      this.logger.log('Application started, logger has been initialized!');
    }
  }

  ngAfterViewInit() {
    this.loginAutomatically().then();
  }

  private async loginAutomatically() {
    this.logger.log('Trying to log in automatically');
    try {
      const success = await this.appService.checkSessionToken();
      if (success) {
        const url = await this.storageService.collectSavedProjectAndTrackerPages();
        this.logger.log(`Navigating to constructed previously saved URL: [${url}]`);
        await this.router.navigateByUrl(url);
      } else {
        this.logger.log('Auto-login was unsuccessful!');
      }
    } catch (err) {
      this.logger.err('Could not login automatically!', err);
    }
  }

}
