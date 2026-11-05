// apps/tool-temp-email/src/temp-email.component.ts
import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TempEmailService } from './services/temp-email.service';
import { AddressBarComponent } from './components/address-bar/address-bar.component';
import { InboxListComponent } from './components/inbox-list/inbox-list.component';
import { EmailViewerComponent } from './components/email-viewer/email-viewer.component';
import { CustomAddressModalComponent } from './components/custom-address-modal/custom-address-modal.component';
import { QrModalComponent } from './components/qr-modal/qr-modal.component';
import { LinkPreviewModalComponent } from './components/link-preview-modal/link-preview-modal.component';
import { WipeDataModalComponent } from './components/wipe-data-modal/wipe-data-modal.component';
import { TsIconComponent } from '@acklet/tool-shell';

@Component({
  selector: 'app-temp-email-tool',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    AddressBarComponent,
    InboxListComponent,
    EmailViewerComponent,
    CustomAddressModalComponent,
    QrModalComponent,
    LinkPreviewModalComponent,
    WipeDataModalComponent,
    TsIconComponent
  ],
  templateUrl: './temp-email.component.html',
  styleUrls: ['./temp-email.component.css']
})
export class TempEmailComponent implements OnInit, OnDestroy {
  readonly emailService = inject(TempEmailService);

  readonly showCustomModal = signal<boolean>(false);
  readonly showQrModal = signal<boolean>(false);
  readonly showWipeModal = signal<boolean>(false);

  ngOnInit(): void {
    this.emailService.initialize();
  }

  ngOnDestroy(): void {
    this.emailService.cleanup();
  }

  onSelectMessage(id: string): void {
    this.emailService.openMessage(id);
  }

  onBackToList(): void {
    this.emailService.closeMessage();
  }

  onDeleteMessage(id: string): void {
    this.emailService.deleteMessage(id);
  }

  async onConfirmWipe(): Promise<void> {
    await this.emailService.wipeAllData();
    this.showWipeModal.set(false);
  }
}
