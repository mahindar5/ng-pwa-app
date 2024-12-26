import { Component, inject, input, model } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonTitle, IonToolbar, ModalController } from '@ionic/angular/standalone';
import { FileItem } from '@mahindar5/common-lib/dist';
import { FileManagerComponent } from '../file-manager/file-manager.component';

@Component({
	selector: 'app-file-manager-modal',
	templateUrl: './file-manager-modal.component.html',
	imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonFooter, IonButtons, IonButton, FileManagerComponent]
})
export class FileManagerModalComponent {
	private readonly modalController = inject(ModalController);
	acceptReferences = input<boolean>(false);
	allFiles = model<FileItem[]>([]);

	closeModal(): void {
		this.modalController.dismiss({ allFiles: this.allFiles() });
	}
}
