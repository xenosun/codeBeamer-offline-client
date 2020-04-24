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
import {PreloadAllModules, RouterModule, Routes} from '@angular/router';
import {LoginPage} from './pages/login/login';
import {ProjectListPage} from './pages/project-list/project-list';
import {TrackerListPage} from './pages/tracker-list/tracker-list';
import {TabsPage} from './pages/tabs/tabs';
import {AvailableTestRunsPage} from './pages/tabs/available-test-runs/available-test-runs';
import {DownloadedTestRunsPage} from './pages/tabs/downloaded-test-runs/downloaded-test-runs';
import {CompletedTestRunsPage} from './pages/tabs/completed-test-runs/completed-test-runs';
import {TestRunDetailsPage} from './pages/tabs/downloaded-test-runs/test-run-details/test-run-details';
import {UploadTestRunPage} from './pages/tabs/completed-test-runs/upload-test-run/upload-test-run';
import {BugListPage} from './pages/tabs/downloaded-test-runs/test-run-details/bug-list/bug-list';
import {TestRunnerPage} from './pages/tabs/downloaded-test-runs/test-run-details/test-runner/test-runner';
import {TestRunDetailResolverService} from './services/test-run-detail-resolver.service';
import {DownloadedTestRunsResolverService} from './services/downloaded-test-runs-resolver.service';
import {SavedProjectAndTrackerResolverService} from './services/saved-project-and-tracker-resolver.service';
import {AuthenticationGuard} from './services/authentication.guard';

const routes: Routes = [
  {path: '', redirectTo: 'login', pathMatch: 'full'},
  {path: 'login', component: LoginPage},
  {
    path: '', canActivate: [AuthenticationGuard], children: [

      {path: 'projects', component: ProjectListPage},
      {path: 'project/:projectId/trackers', component: TrackerListPage},
      {
        path: 'project/:projectId/tracker/:trackerId', component: TabsPage, children: [
          {path: 'available-test-runs', component: AvailableTestRunsPage, resolve: {savedData: SavedProjectAndTrackerResolverService}},
          {
            path: 'downloaded-test-runs',
            component: DownloadedTestRunsPage,
            resolve: {downloadedTestRuns: DownloadedTestRunsResolverService}
          },
          {path: 'completed-test-runs', component: CompletedTestRunsPage, resolve: {downloadedTestRuns: DownloadedTestRunsResolverService}},
        ]
      },
      {
        path: 'downloaded-test-runs/:testRunId/test-run-details/:testCaseIndex', children: [
          {path: '', component: TestRunDetailsPage, resolve: {testRunDetails: TestRunDetailResolverService}},
          {path: 'reported-bugs', component: BugListPage, resolve: {testRunDetails: TestRunDetailResolverService}},
          {path: 'test-runner', component: TestRunnerPage, resolve: {testRunDetails: TestRunDetailResolverService}},
        ]
      },
      {path: 'completed-test-runs/:testRunId/upload-test-run', component: UploadTestRunPage,
        resolve: {testRunDetails: TestRunDetailResolverService}},
    ]
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {preloadingStrategy: PreloadAllModules})
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
