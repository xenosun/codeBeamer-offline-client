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

import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {IonicModule, IonicRouteStrategy} from '@ionic/angular';
import {MyApp} from './app.component';

import {LoginPage} from './pages/login/login';
import {TabsPage} from './pages/tabs/tabs';

import {StatusBar} from '@ionic-native/status-bar/ngx';
import {SplashScreen} from '@ionic-native/splash-screen/ngx';
import {AppService} from './services/app.service';
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule} from '@angular/common/http';
import {TestRunDetailsPage} from './pages/tabs/downloaded-test-runs/test-run-details/test-run-details';
import {TestRunnerPage} from './pages/tabs/downloaded-test-runs/test-run-details/test-runner/test-runner';
import {ComponentsModule} from './components/components.module';
import {File} from '@ionic-native/file/ngx';
import {Network} from '@ionic-native/network/ngx';
import {UploadTestRunPage} from './pages/tabs/completed-test-runs/upload-test-run/upload-test-run';
import {TrackerListPage} from './pages/tracker-list/tracker-list';
import {ProjectListPage} from './pages/project-list/project-list';
import {BugListPage} from './pages/tabs/downloaded-test-runs/test-run-details/bug-list/bug-list';
import {ReportBugPage} from './pages/tabs/downloaded-test-runs/test-run-details/test-runner/report-bug/report-bug';
import {IonicStorageModule} from '@ionic/storage';
import {PipesModule} from './pipes/pipes.module';
import {ShowBugPage} from './pages/tabs/downloaded-test-runs/test-run-details/bug-list/show-bug/show-bug';
import {RequestCacheProvider} from './interceptors/request-cache';
import {CachingInterceptor} from './interceptors/caching-interceptor';
import {StorageService} from './services/storage.service';
import {FileSystemService} from './services/file-system.service';
import {AppRoutingModule} from './app-routing.module';
import {RouteReuseStrategy} from '@angular/router';
import {AvailableTestRunsPage} from './pages/tabs/available-test-runs/available-test-runs';
import {DownloadedTestRunsPage} from './pages/tabs/downloaded-test-runs/downloaded-test-runs';
import {CompletedTestRunsPage} from './pages/tabs/completed-test-runs/completed-test-runs';
import {FormsModule} from '@angular/forms';
import {UploadService} from './services/upload.service';
import {WebView} from '@ionic-native/ionic-webview/ngx';
import {EventService} from './services/event.service';
import {AuthInterceptor} from './interceptors/auth-interceptor';
import {LogProvider} from './services/ionic-log-file-appender/log.service';
import {DatePipe} from '@angular/common';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';

@NgModule({
  declarations: [
    MyApp,
    LoginPage,
    TabsPage,
    AvailableTestRunsPage,
    DownloadedTestRunsPage,
    TestRunDetailsPage,
    TestRunnerPage,
    CompletedTestRunsPage,
    UploadTestRunPage,
    ProjectListPage,
    TrackerListPage,
    BugListPage,
    ShowBugPage,
    ReportBugPage,
  ],
  imports: [
    FormsModule,
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientModule,
    ComponentsModule,
    PipesModule,
    IonicStorageModule.forRoot(),
  ],
  entryComponents: [
    ReportBugPage,
    ShowBugPage,
  ],
  bootstrap: [MyApp],
  providers: [
    WebView,
    StatusBar,
    SplashScreen,
    {provide: RouteReuseStrategy, useClass: IonicRouteStrategy},
    // {provide: ErrorHandler, useClass: IonicErrorHandler},
    AppService,
    EventService,
    StorageService,
    FileSystemService,
    UploadService,
    HttpClient,
    File,
    Network,
    RequestCacheProvider,
    {provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true},
    {provide: HTTP_INTERCEPTORS, useClass: CachingInterceptor, multi: true},
    LogProvider,
    DatePipe,
    SocialSharing,
  ]
})
export class AppModule {
}
