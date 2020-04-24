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

import {ChangeDetectorRef, Component, NgZone, ViewChild} from '@angular/core';
import {AppService} from '../../services/app.service';
import {Subscription} from 'rxjs';
import {IonTabs} from '@ionic/angular';

@Component({
  templateUrl: 'tabs.html',
  styleUrls: ['./tabs.scss']
})
export class TabsPage {

  @ViewChild('tabs', {static: true}) tabs: IonTabs;

  isOnline = true;

  networkAvailableSub: Subscription;

  constructor(public appService: AppService,
              public cd: ChangeDetectorRef,
              private zone: NgZone) {
  }

  ionViewWillEnter() {
    this.networkAvailableSub = this.appService.networkAvailable.subscribe((isOnline: boolean) => {
      this.isOnline = isOnline && !this.appService.offlineLoggedIn;
      this.handleNetworkChange().then();
    });
  }

  ionViewWillLeave() {
    if (this.networkAvailableSub) {
      this.networkAvailableSub.unsubscribe();
    }
  }

  private async handleNetworkChange() {
    await this.zone.runOutsideAngular(async () => {
      if (this.tabs && !this.isOnline) {
        await this.tabs.select('downloaded-test-runs');
      }
      this.cd.detectChanges();
    });
  }

}
