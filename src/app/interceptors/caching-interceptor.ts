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

import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable, OnDestroy} from '@angular/core';
import {Observable, of, Subscription} from 'rxjs';
import {RequestCacheProvider} from './request-cache';
import {AppService} from '../services/app.service';
import {tap} from 'rxjs/operators';

@Injectable()
export class CachingInterceptor implements HttpInterceptor, OnDestroy {

  private networkAvailableSub: Subscription;
  private useCache = false;

  constructor(private cache: RequestCacheProvider,
              private appProvider: AppService) {
    this.networkAvailableSub = this.appProvider.networkAvailable.subscribe((networkAvailable: boolean) => {
      this.useCache = !networkAvailable;
    });
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if (!this.isCachable(req)) {
      return next.handle(req);
    }

    const cachedResponse = this.cache.get(req);

    return cachedResponse && this.useCache ? of(cachedResponse) : this.sendRequest(req, next, this.cache);
  }

  isCachable(req: HttpRequest<any>): boolean {
    // return req.method === 'GET' && req.urlWithParams.includes('/displayDocument')
    //   && req.headers.get('Accept') === 'image/*';
    return false;
  }

  sendRequest(req: HttpRequest<any>, next: HttpHandler, cache: RequestCacheProvider): Observable<HttpEvent<any>> {

    return next.handle(req.clone()).pipe(
      tap(event => {
        // There may be other events besides the response.
        if (event instanceof HttpResponse) {
          cache.put(req, event); // Update the cache.
        }
      })
    );
  }

  ngOnDestroy() {
    this.networkAvailableSub.unsubscribe();
  }

}
