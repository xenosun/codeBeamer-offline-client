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
import {ModalController, NavController} from '@ionic/angular';
import {InitializedTestCase} from '../../../../../models/initialized-test-case';
import {ShowBugPage} from './show-bug/show-bug';
import {TrackerItemModel} from '../../../../../models/tracker-item.model';
import {ActivatedRoute, Router} from '@angular/router';
import {TestRunData} from '../../../../../services/test-run-detail-resolver.service';

@Component({
  selector: 'page-bug-list',
  templateUrl: 'bug-list.html',
  styleUrls: ['./bug-list.scss']
})
export class BugListPage {

  testRunId: number;
  testCase: InitializedTestCase;
  testCaseIndex: number;

  constructor(public modalCtrl: ModalController,
              private navController: NavController,
              private router: Router,
              private route: ActivatedRoute) {
    this.initialize();
  }

  async navigateBackTestRunDetails() {
    this.navController.setDirection('back', true, 'back');
    await this.router.navigate([
      `/downloaded-test-runs/${this.testRunId}/test-run-details/${this.testCaseIndex}`
    ], {replaceUrl: true});
  }

  async openBug(bug: TrackerItemModel) {
    const modal = await this.modalCtrl.create({
      component: ShowBugPage,
      componentProps: {
        bug
      },
      backdropDismiss: false,
    });
    await modal.present();
  }

  private initialize() {
    this.route.data.subscribe((data: {testRunDetails: TestRunData}) => {
      this.testRunId = data.testRunDetails.testRun.testRunId;
      this.testCase = data.testRunDetails.testCase;
      this.testCaseIndex = data.testRunDetails.testCaseIndex;
    });
  }

}
