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
import {DownloadedTestRun} from '../../../models/downloaded-test-run';
import {Subscription} from 'rxjs';
import {AppService} from '../../../services/app.service';
import {StorageService} from '../../../services/storage.service';
import {TestRunStatus} from '../../../models/test-run-status';
import {ActivatedRoute, Router} from '@angular/router';
import {NavigateToTrackerListComponent} from '../../../components/navigate-to-tracker-list/navigate-to-tracker-list.component';

@Component({
  selector: 'page-completed-test-runs',
  templateUrl: 'completed-test-runs.html',
  styleUrls: ['./completed-test-runs.scss']
})
export class CompletedTestRunsPage extends NavigateToTrackerListComponent {

  finishedTestRuns: DownloadedTestRun[];
  networkAvailableSub: Subscription;

  constructor(public router: Router,
              private route: ActivatedRoute,
              private appService: AppService,
              public storageService: StorageService) {
    super(storageService, router);
    this.initialize();
  }

  ionViewWillEnter() {
    this.networkAvailableSub = this.appService.networkAvailable.subscribe((available: boolean) => {
    });
  }

  ionViewWillLeave() {
    if (this.networkAvailableSub) {
      this.networkAvailableSub.unsubscribe();
    }
  }

  async viewTestRunUploads(testRun: DownloadedTestRun) {
    await this.router.navigateByUrl(`/completed-test-runs/${testRun.testRunId}/upload-test-run`);
  }

  private initialize() {
    this.route.data.subscribe((data: {downloadedTestRuns: DownloadedTestRun[]}) => {
      if (data.downloadedTestRuns) {
        this.finishedTestRuns = data.downloadedTestRuns.filter((dtr: DownloadedTestRun) =>
          dtr.initializedTestRun.testRun.status && dtr.initializedTestRun.testRun.status.id === TestRunStatus.FINISHED
        );
      }
    });
  }

}
