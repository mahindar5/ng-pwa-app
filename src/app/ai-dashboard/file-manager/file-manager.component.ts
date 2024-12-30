import { Component, ElementRef, inject, input, model, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonBadge, IonButton, IonButtons, IonCheckbox, IonIcon, IonItem, IonItemGroup, IonLabel, IonProgressBar, ModalController } from '@ionic/angular/standalone';
import { FileItem, FileService } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { checkmarkDoneCircle, documentOutline, duplicateOutline, folderOutline, gitNetwork, save, saveOutline, trashOutline } from 'ionicons/icons';

@Component({
	selector: 'app-file-manager',
	templateUrl: './file-manager.component.html',
	styleUrls: ['./file-manager.component.scss'],
	imports: [
		FormsModule, IonButton, IonButtons, IonCheckbox, IonIcon, IonItem, IonItemGroup,
		IonLabel, IonProgressBar, IonBadge,
	],
})
export class FileManagerComponent {
	private readonly fileService = inject(FileService);
	private readonly alertController = inject(AlertController);
	private readonly modalController = inject(ModalController);
	readonly dropZoneRef = viewChild<ElementRef>('dropZone');

	allFiles = model.required<FileItem[]>();
	acceptReferences = input<boolean>(false);

	constructor() {
		addIcons({ checkmarkDoneCircle, documentOutline, folderOutline, save, saveOutline, duplicateOutline, trashOutline, gitNetwork });
	}

	async openReferenceModal(file: FileItem): Promise<void> {
		const { FileManagerModalComponent } = await import('./file-manager-modal.component');
		const modal = await this.modalController.create({
			component: FileManagerModalComponent,
			componentProps: { allFiles: file.references || [] }
		});

		modal.onDidDismiss().then((response) => {
			const updatedReferences = response.data?.allFiles as FileItem[];
			if (updatedReferences) {
				file.references = updatedReferences;
				file.referencesCount = updatedReferences.filter(reference => reference.selected).length;
				this.allFiles.set([...this.allFiles()]);
			}
		});

		await modal.present();
	}

	toggleSelectAllFiles(): void {
		const isAllSelected = this.allFiles().every(file => file.selected);
		this.allFiles.set(this.allFiles().map(file => ({ ...file, selected: !isAllSelected })));
	}

	onDragOver(event: DragEvent): void {
		event.preventDefault();
		this.dropZoneRef()?.nativeElement.classList.add('drag-over');
	}

	onDragLeave(event: DragEvent): void {
		event.preventDefault();
		this.dropZoneRef()?.nativeElement.classList.remove('drag-over');
	}

	async onFileDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		this.dropZoneRef()?.nativeElement.classList.remove('drag-over');
		await this.updateFiles(() => this.fileService.handleDrop(event));
	}

	async selectFolder(): Promise<void> {
		await this.updateFiles(() => this.fileService.selectFolder());
	}

	async selectFiles(): Promise<void> {
		await this.updateFiles(() => this.fileService.selectFiles());
	}

	async saveFile(file: FileItem): Promise<void> {
		if (file.handle) {
			await this.fileService.writeToFile(file);
		} else {
			await this.saveFileAs(file);
		}
	}

	async saveFileAs(file: FileItem): Promise<void> {
		const updatedFile = await this.fileService.saveFileAs(file);
		if (updatedFile) {
			this.allFiles.set(this.allFiles().map(item => item.path === file.path ? updatedFile : item));
		}
	}

	async saveAllFiles(): Promise<void> {
		const savePromises = this.allFiles().map(file => this.saveFile(file));
		await Promise.all(savePromises);
	}

	hasUnsavedChanges(): boolean {
		return this.allFiles().some(file => file.status === 'done' && file.code?.trim());
	}

	clearFiles(): void {
		this.allFiles.set([]);
	}

	getProgressValue(file: FileItem): number {
		if (file.status === 'done') return 1;
		if (file.status === 'error' || file.status === 'unmodified') return 0.5;
		return 0;
	}

	private async updateFiles(getFiles: () => Promise<FileItem[]>): Promise<void> {
		const newFiles = await getFiles();
		if (newFiles.length === 0) return;

		const currentFiles = this.allFiles();
		if (currentFiles.length === 0) {
			this.allFiles.set(newFiles);
			return;
		}

		const alert = await this.alertController.create({
			header: 'Replace the list of Files',
			message: 'Do you want to append, replace, or skip to add them?',
			buttons: [
				{ text: 'Replace', handler: () => this.allFiles.set(newFiles) },
				{ text: 'Skip', role: 'cancel' },
				{
					text: 'Append', handler: () => {
						this.allFiles.set([...currentFiles, ...newFiles.filter(newFile =>
							!currentFiles.some(currentFile => currentFile.path === newFile.path)
						)]);

					}
				},
			]
		});
		await alert.present();
	}
}
