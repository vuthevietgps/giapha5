import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-mobile-setup',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatListModule, 
    MatDividerModule,
    MatTabsModule,
    MatExpansionModule
  ],
  templateUrl: './mobile-setup.page.html',
  styleUrl: './mobile-setup.page.scss'
})
export class MobileSetupPage {
  apkUrl = environment.apkUrl || '/downloads/giapha-android.apk';
  ipaUrl = environment.ipaUrl || '/downloads/giapha-ios.ipa';
  apiUrl = environment.apiBaseUrl;
}
