import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonItem, IonItemGroup, IonLabel, IonMenu, IonMenuButton, IonProgressBar, IonSplitPane, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIService, COMMON_INSTRUCTIONS, FileItem, FileService, FileStatus, INDENTATION, OUTPUT_FORMAT, ProcessingStrategy, PromptModal } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, duplicateOutline, folderOutline, save, saveOutline, send, settingsOutline, stopCircleOutline, trashOutline } from 'ionicons/icons';
import { AiProcessingService } from '../ai-processing.service';
import { BaseAiComponent } from '../base-ai.component';
import { SettingsComponent } from '../settings/settings.component';

@Component({
	selector: 'app-ai-agent',
	templateUrl: './ai-agent.component.html',
	styleUrls: ['./ai-agent.component.scss'],
	providers: [FileService, AiProcessingService, AIService],
	imports: [
		FormsModule, IonHeader, IonCheckbox, IonProgressBar, IonToolbar, IonTitle,
		IonButton, IonIcon, IonContent, IonItem, IonLabel, IonTextarea, IonButtons,
		IonMenuButton, IonSplitPane, IonMenu, SettingsComponent, IonItemGroup
	],
})
export class AiAgentComponent extends BaseAiComponent implements OnInit {
	private readonly fileService = inject(FileService);
	private readonly dropZoneRef = viewChild<ElementRef>('dropZone');

	isMultiSelectMode = computed(() => this.settings().processingStrategy === ProcessingStrategy.Combined);
	allFiles = signal<FileItem[]>([]);
	currentFileList = computed(() => this.fileService.updateFileList(this.currentPrompt(), this.allFiles()));

	currentPrompt = computed<PromptModal>(() => {
		const settings = this.settings();
		return {
			name: settings.selectedPrompt.name,
			type: settings.selectedPrompt.type,
			prompt: `#INSTRUCTIONS:
${settings.selectedPrompt.excludeCommonInstructions ? '' : COMMON_INSTRUCTIONS.join('\n')}
${settings.selectedPrompt.promptTextList.map(p => p.text).join('\n')}

#ROLE:
${settings.selectedPrompt.role}`
		}
	});
	settings = this.settingsService.settings;

	constructor() {
		super();
		addIcons({ checkmark, checkmarkDoneCircle, close, colorWandOutline, createOutline, settingsOutline, cloudDoneOutline, documentOutline, folderOutline, send, chatbubblesOutline, clipboardOutline, saveOutline, duplicateOutline, save, trashOutline, stopCircleOutline });
	}

	override ngOnInit(): void {
		super.ngOnInit();
	}

	async onProcessFiles(): Promise<void> {
		this.isProcessing.set(true);
		try {
			const filesToProcess = this.isMultiSelectMode()
				? this.currentFileList().filter(item => item.selected)
				: this.currentFileList();

			if (filesToProcess.length === 0) return;

			const prompt = `${this.currentPrompt().prompt}\n\n${INDENTATION}\n\n${OUTPUT_FORMAT}`;
			await this.aiProcessingService.processFiles(
				filesToProcess,
				prompt,
				this.settings(),
				this.showAuthenticationAlert.bind(this),
				this.updateFileItemStatus.bind(this)
			);
		} finally {
			this.isProcessing.set(false);
		}
	}

	onStopProcessing(): void {
		// this.aiProcessingService.stopProcessing();
		this.allFiles.update((items) => items.map(item => item.status === 'inprogress' ? { ...item, status: 'unmodified' } : item));
		this.isProcessing.set(false);
	}

	onSelectAllFiles(): void {
		const allSelected = this.currentFileList().every(file => file.selected);
		this.allFiles.update((items) => items.map(item => ({ ...item, selected: !allSelected })));
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
		await this.handleFilesUpdate(async () => await this.fileService.handleDrop(event));
	}

	async onSelectFolder(): Promise<void> {
		await this.handleFilesUpdate(async () => await this.fileService.selectFolder());
	}

	async onSelectFiles(): Promise<void> {
		await this.handleFilesUpdate(async () => await this.fileService.selectFiles());
	}

	isProcessButtonDisabled(): boolean {
		return !this.currentPrompt().prompt || this.currentFileList().length < 1 || this.isProcessing();
	}

	private updateFileItemStatus(fileItem: FileItem, status: FileStatus, code: string, error: string): void {
		this.allFiles.update((items) => {
			const updatedItems = items.map(item => item.path === fileItem.path ? { ...item, status, code, error } : item);
			if (!updatedItems.some(item => item.path === fileItem.path)) {
				updatedItems.push({ ...fileItem, status, code, error });
			}
			return updatedItems;
		});
	}

	async onSaveFile(file: FileItem): Promise<void> {
		if (file.handle) {
			await this.fileService.writeToFile(file);
		} else {
			await this.onSaveFileAs(file);
		}
	}

	async onSaveFileAs(file: FileItem): Promise<void> {
		await this.fileService.saveFileAs(file);
	}

	async onSaveAllFiles(): Promise<void> {
		const savedFiles = await Promise.all(this.currentFileList().map(async (file) => {
			if (file.status !== 'done') return null;
			if (file.handle) {
				await this.fileService.writeToFile(file);
				return file;
			} else {
				return await this.fileService.saveFileAs(file);
			}
		}));

		const successCount = savedFiles.filter(file => file !== null).length;
		const message = successCount > 0
			? `${successCount} file(s) saved successfully.`
			: 'No files were saved.';
	}

	canSaveAll(): boolean {
		return this.currentFileList().some(file => file.status === 'done');
	}

	onClearFiles(): void {
		this.allFiles.set([]);
	}

	private async handleFilesUpdate(getFiles: () => Promise<FileItem[]>): Promise<void> {
		const newFiles = await getFiles();
		if (newFiles.length > 0) {
			const existingFiles = this.allFiles();

			if (existingFiles.length > 0) {
				const alert = await this.alertController.create({
					header: 'Replace the list of Files',
					message: 'Do you want to append, replace, or skip to add them?',
					buttons: [
						{ text: 'Replace', handler: () => this.allFiles.set(newFiles) },
						{ text: 'Skip', role: 'cancel', },
						{
							text: 'Append', handler: () => {
								this.allFiles.update(currentFiles => {
									const nonDuplicateNewFiles = newFiles.filter(newFile =>
										!currentFiles.some(existingFile => existingFile.path === newFile.path)
									);
									return [...currentFiles, ...nonDuplicateNewFiles];
								});
							}
						},
					]
				});
				await alert.present();
			} else {
				this.allFiles.set(newFiles);
			}
		}
	}
}
