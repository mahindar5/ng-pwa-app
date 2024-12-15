import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonCheckbox, IonCol, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonRow, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { FileItem, FileService, ProcessingStrategy, PromptModal } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, folderOutline, send, settingsOutline } from 'ionicons/icons';
import { AiProcessingService } from '../ai-processing.service';
import { BaseAiComponent } from '../base-ai.component';
import { SettingsService } from '../settings/settings.service';

@Component({
	selector: 'app-ai-agent',
	templateUrl: './ai-agent.component.html',
	styleUrls: ['./ai-agent.component.scss'],
	standalone: true,
	providers: [FileService, AiProcessingService],
	imports: [
		FormsModule, IonHeader, IonCheckbox, IonProgressBar, IonToolbar,
		IonTitle, IonButton, IonIcon, IonContent, IonRow, IonCol,
		IonList, IonItem, IonLabel, IonTextarea,
		IonButtons, IonMenuButton, IonSelect, IonSelectOption
	],
})
export class AiAgentComponent extends BaseAiComponent implements OnInit {
	private readonly fileService = inject(FileService);
	private readonly aiProcessingService = inject(AiProcessingService);
	override readonly settingsService = inject(SettingsService);

	@ViewChild('dropZone') dropZoneRef!: ElementRef;

	currentPrompt = signal<PromptModal>({} as PromptModal);
	allFiles = signal<FileItem[]>([]);
	currentFileList = computed(() => this.fileService.updateFileList(this.currentPrompt(), this.allFiles()));
	currentProcessingStrategy = signal<ProcessingStrategy>(ProcessingStrategy.Combined);
	isMultiSelectMode = computed(() => this.currentProcessingStrategy() === ProcessingStrategy.Combined);
	settings = this.settingsService.settings;
	selectedPromptName = 'angular';

	constructor() {
		super();
		addIcons({ checkmark, checkmarkDoneCircle, close, colorWandOutline, createOutline, settingsOutline, cloudDoneOutline, documentOutline, folderOutline, send, chatbubblesOutline, clipboardOutline });
	}

	override ngOnInit(): void {
		super.ngOnInit();
		this.initializePrompt();
		this.currentProcessingStrategy.set(this.settings().processingStrategy);
	}

	async onProcessFiles(): Promise<void> {
		this.isProcessing.set(true);
		try {
			const filesToProcess = this.isMultiSelectMode()
				? this.currentFileList().filter(item => item.selected)
				: this.currentFileList();

			if (filesToProcess.length === 0) return;

			await this.aiProcessingService.processFiles(
				filesToProcess,
				this.currentPrompt().prompt,
				this.selectedModel(),
				this.showAuthenticationAlert.bind(this),
				this.updateFileItemStatus.bind(this),
				this.processResponse.bind(this)
			);
		} finally {
			this.isProcessing.set(false);
		}
	}

	onSelectAllFiles(): void {
		this.allFiles.update((items) => items.map(item => ({ ...item, selected: true })));
	}

	onDragOver(event: DragEvent): void {
		event.preventDefault();
		this.dropZoneRef.nativeElement.classList.add('drag-over');
	}

	onDragLeave(event: DragEvent): void {
		event.preventDefault();
		this.dropZoneRef.nativeElement.classList.remove('drag-over');
	}

	async onFileDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		this.dropZoneRef.nativeElement.classList.remove('drag-over');
		this.allFiles.set(await this.fileService.handleDrop(event));
	}

	async onSelectFolder(): Promise<void> {
		this.allFiles.set(await this.fileService.selectFolder());
	}

	async onSelectFiles(): Promise<void> {
		this.allFiles.set(await this.fileService.selectFiles());
	}

	isProcessButtonDisabled(): boolean {
		return !this.currentPrompt().prompt || this.currentFileList().length < 1 || this.isProcessing();
	}

	private updateFileItemStatus(fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string): void {
		this.allFiles.update((items) => items.map(item => item.path === fileItem.path ? { ...item, status, res } : item));
	}

	private initializePrompt(): void {
		this.onPromptChange();
	}
	onPromptChange(): void {
		const selectedPrompt = this.settings().prompts.find(p => p.name === this.selectedPromptName) || this.settings().prompts[0];
		this.currentPrompt.set({
			name: selectedPrompt?.name,
			prompt: `#ROLE:
${selectedPrompt?.role}

#INSTRUCTIONS:
${selectedPrompt?.promptTextList.map(p => p.text).join('\n')}

#OUTPUT FORMAT:
#FILE:<filename>
<code>
#END_FILE`,
			type: selectedPrompt.type
		});
	}
}
