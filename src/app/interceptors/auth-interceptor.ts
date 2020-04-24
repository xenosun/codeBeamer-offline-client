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

import {HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest, HttpResponse} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable, throwError} from 'rxjs';
import {AppService} from '../services/app.service';
import {Storage} from '@ionic/storage';
import {catchError, tap} from 'rxjs/operators';
import {Router} from '@angular/router';
import {fromPromise} from 'rxjs/internal-compatibility';
import {AlertController, LoadingController} from '@ionic/angular';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  private static readonly AUTHOR_HEADER_KEY = 'Authorization';
  private static readonly NO_TOKEN = 'no-token';

  constructor(private appService: AppService,
              private storage: Storage,
              private loadingCtrl: LoadingController,
              private alertCtrl: AlertController,
              private router: Router) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let token = this.appService.token;
    if (!token) {
      token = AuthInterceptor.NO_TOKEN;
    }
    let updatedHeaders: HttpHeaders = req.headers;
    if (!req.headers.has(AuthInterceptor.AUTHOR_HEADER_KEY) || !req.headers.get(AuthInterceptor.AUTHOR_HEADER_KEY).startsWith('Basic ')) {
      updatedHeaders = updatedHeaders.set(AuthInterceptor.AUTHOR_HEADER_KEY, `Bearer ${token}`);
    }
    const updatedReq = req.clone({
      headers: updatedHeaders
    });
    return next.handle(updatedReq).pipe(
      tap((event: HttpEvent<any>) => {
        if (event instanceof HttpResponse) {
          const newToken = event.headers.get('new-token');
          if (newToken) {
            this.appService.token = newToken;
            this.storage.set('token', newToken).then();
          }
        }
      }),
      catchError(err => {
        if ((err instanceof HttpErrorResponse) && err.status === 401) {
           return fromPromise(
            this.router.navigateByUrl('/login').then(() => {
              this.loadingCtrl.dismiss().catch(() => console.warn('There are no loaders to dismiss!'));
              this.alertCtrl.dismiss().catch(() => console.warn('There are no alerts to dismiss!'));
              return null;
            })
          );
        }
        return throwError(err);
      })
    );
  }

}
