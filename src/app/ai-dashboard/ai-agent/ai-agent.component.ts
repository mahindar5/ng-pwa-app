import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { FileItem, FileService, prompts } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, folderOutline, send, settingsOutline } from 'ionicons/icons';
import { AiProcessingService, ProcessingStrategy } from '../ai-processing.service';
import { BaseAiComponent } from './base-ai.component';

@Component({
	selector: 'app-ai-agent',
	templateUrl: './ai-agent.component.html',
	styleUrl: './ai-agent.component.scss',
	providers: [FileService, AiProcessingService],
	imports: [
		FormsModule, IonHeader, IonCheckbox, IonProgressBar, IonToolbar,
		IonTitle, IonButton, IonIcon, IonContent,
		IonList, IonItem, IonLabel, IonTextarea,
		IonButtons, IonSelectOption, IonSelect, IonMenuButton
	],
})
export class AiAgentComponent extends BaseAiComponent {
	private readonly fileService = inject(FileService);
	private readonly aiProcessingService = inject(AiProcessingService);
	private readonly dropZoneRef = viewChild<ElementRef>('dropZone');

	prompts = signal(prompts);
	selectedPrompt = signal(prompts.find(p => p.name === 'ng') || prompts[0]);
	allFileHandles = signal<FileItem[]>([]);
	fileList = computed(() => this.fileService.updateFileList(this.selectedPrompt().name, this.allFileHandles()));
	processingStrategies = Object.values(ProcessingStrategy);
	selectedStrategy = signal<ProcessingStrategy>(ProcessingStrategy.Combined);
	multiSelectMode = computed(() => this.selectedStrategy() === ProcessingStrategy.Combined);

	constructor() {
		super();
		addIcons({ checkmark, checkmarkDoneCircle, close, colorWandOutline, createOutline, settingsOutline, cloudDoneOutline, documentOutline, folderOutline, send, chatbubblesOutline, clipboardOutline });
	}

	override ngOnInit(): void {
		super.ngOnInit();
	}

	async processFiles(): Promise<void> {
		this.isProcessing.set(true);
		try {
			const fileItemsToProcess = this.selectedStrategy() === ProcessingStrategy.Combined
				? this.fileList().filter(item => item.selected)
				: this.fileList();

			if (fileItemsToProcess.length === 0) {
				return;
			}

			await this.aiProcessingService.processFiles(
				fileItemsToProcess,
				this.selectedPrompt().prompt,
				this.selectedModel(),
				this.showAuthenticationAlert.bind(this),
				this.updateFileItemObject.bind(this),
				this.processResponse.bind(this)
			);
		} finally {
			this.isProcessing.set(false);
		}
	}

	onStrategyChange(event: CustomEvent): void {
		this.selectedStrategy.set(event.detail.value);
		this.aiProcessingService.setProcessingStrategy(this.selectedStrategy());
	}

	selectAll() {
		this.allFileHandles.update((items) => items.map(item => ({ ...item, selected: true })));
	}

	handleDrag(event: DragEvent, action: 'add' | 'remove'): void {
		event.preventDefault();
		this.dropZoneRef()?.nativeElement.classList[action]('drag-over');
	}

	async onDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		this.handleDrag(event, 'remove');
		this.allFileHandles.set(await this.fileService.handleDrop(event));
	}

	async selectFolder(): Promise<void> {
		this.allFileHandles.set(await this.fileService.selectFolder());
	}

	async selectFiles(): Promise<void> {
		this.allFileHandles.set(await this.fileService.selectFiles());
	}

	private updateFileItemObject(fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string): void {
		this.allFileHandles.update((items) => items.map(item => item.path === fileItem.path ? { ...item, status, res } : item));
	}
}
