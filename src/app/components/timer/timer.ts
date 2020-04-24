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

import {Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';
import {Subscription, timer} from 'rxjs';

@Component({
  selector: 'timer',
  templateUrl: 'timer.html'
})
export class TimerComponent implements OnDestroy {

  _paused: boolean = false;
  _startTime: { value: number, index: number };

  private ticks = 0;
  minutesDisplay = 0;
  hoursDisplay = 0;
  secondsDisplay = 0;
  subscription: Subscription;

  @Input('isPaused') set isPaused(value: boolean) {
    console.log('isPaused', value);
    this._paused = value;
    if (this.isPaused) {
      this.unsubscribe();
    } else {
      if (this.subscription && this.subscription.closed) {
        this.startTime.value = this.ticks;
        this.startTimer();
      }
    }
  }

  get isPaused(): boolean {
    return this._paused;
  }

  @Input('startTime') set startTime(time: { value: number, index: number }) {
    this._startTime = time;
    this.setTime();
    if (!this.isPaused) {
      this.startTimer();
    }
  }

  get startTime(): { value: number, index: number } {
    return this._startTime;
  }

  @Output('timeValueChanged') timeValueChanged = new EventEmitter<number>();

  constructor() {
  }

  ngOnDestroy(): void {
    this.unsubscribe();
  }

  private setTime(t: number = 0) {
    this.ticks = this.startTime.value + t;
    this.timeValueChanged.emit(this.ticks);
    this.secondsDisplay = this.getSeconds(this.ticks);
    this.minutesDisplay = this.getMinutes(this.ticks);
    this.hoursDisplay = this.getHours(this.ticks);
  }

  private startTimer() {
    this.unsubscribe();
    const _timer = timer(1, 1000);
    this.subscription = _timer.subscribe(
      t => {
        this.setTime(t);
      }
    );
  }

  private unsubscribe() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private getSeconds(ticks: number) {
    return this.padDigit(ticks % 60);
  }

  private getMinutes(ticks: number) {
    return this.padDigit((Math.floor(ticks / 60)) % 60);
  }

  private getHours(ticks: number) {
    return this.padDigit(Math.floor((ticks / 60) / 60));
  }

  private padDigit(digit: any) {
    return digit <= 9 ? '0' + digit : digit;
  }
}
