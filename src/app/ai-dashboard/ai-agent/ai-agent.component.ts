import { Component, linkedSignal, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonMenu, IonMenuButton, IonSplitPane, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIService, COMMON_INSTRUCTIONS, FileItem, FileStatus, INDENTATION, OUTPUT_FORMAT, PromptModal } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, clipboardOutline, close, colorWandOutline, createOutline, send, settingsOutline, stopCircleOutline } from 'ionicons/icons';
import { AiProcessingService } from '../ai-processing.service';
import { BaseAiComponent } from '../base-ai.component';
import { FileManagerComponent } from '../file-manager/file-manager.component';
import { SettingsComponent } from '../settings/settings.component';

@Component({
	selector: 'app-ai-agent',
	templateUrl: './ai-agent.component.html',
	styleUrls: ['./ai-agent.component.scss'],
	providers: [AiProcessingService, AIService],
	imports: [
		FormsModule, IonHeader, IonToolbar, IonTitle,
		IonButton, IonIcon, IonContent, IonTextarea, IonButtons,
		IonMenuButton, IonSplitPane, IonMenu, SettingsComponent, FileManagerComponent
	],
})
export class AiAgentComponent extends BaseAiComponent implements OnInit {
	allFiles = signal<FileItem[]>([]);

	currentPrompt = linkedSignal<PromptModal>(() => {
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
	}, {
		equal: (a, b) => a.name === b.name
	});

	constructor() {
		super();
		addIcons({ close, colorWandOutline, createOutline, settingsOutline, send, chatbubblesOutline, clipboardOutline, stopCircleOutline });
	}

	override ngOnInit(): void {
		super.ngOnInit();
	}

	async onProcessFiles(): Promise<void> {
		this.isProcessing.set(true);
		this.allFiles.update((items) => items.map(item => ({ ...item, status: 'init' } as FileItem)));
		try {
			const filesToProcess = this.allFiles().filter(item => item.selected);

			if (filesToProcess.length === 0) {
				throw new Error('No files selected for processing');
			}

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
			this.allFiles.update((items) => items.map(item => item.status === 'inprogress' ? { ...item, status: 'unmodified' } : item));
		}
	}

	onStopProcessing(): void {
		this.allFiles.update((items) => items.map(item => item.status === 'inprogress' ? { ...item, status: 'unmodified' } : item));
		this.isProcessing.set(false);
	}

	isProcessButtonDisabled(): boolean {
		return !this.currentPrompt().prompt || this.allFiles().length < 1 || this.isProcessing();
	}

	onFileUpdate(updatedFiles: FileItem[]): void {
		this.allFiles.set(updatedFiles);
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
}
