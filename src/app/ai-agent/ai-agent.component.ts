import { Component, ElementRef, inject, OnInit, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
	IonButton, IonButtons,
	IonContent,
	IonHeader, IonIcon,
	IonItem, IonLabel, IonList,
	IonMenuButton, IonProgressBar, IonSelect, IonSelectOption,
	IonTextarea, IonTitle, IonToolbar
} from '@ionic/angular/standalone';
import { GithubCopilotService } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { cloudDoneOutline, createOutline, documentOutline, folderOutline, send } from 'ionicons/icons';
import { prompts } from './prompts';

@Component({
	selector: 'ai-agent-component',
	templateUrl: 'ai-agent.component.html',
	styleUrls: ['ai-agent.component.scss'],
	standalone: true,
	providers: [GithubCopilotService],
	imports: [
		FormsModule, IonHeader, IonProgressBar, IonToolbar, IonButtons, IonMenuButton, IonTitle,
		IonButton, IonIcon, IonContent, IonList, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption
	],
})
export class AIAgentComponent implements OnInit {
	private readonly githubCopilotService = inject(GithubCopilotService);
	isProcessing = false;
	contentRef = viewChild<IonContent>('myContent');
	dropZoneRef = viewChild<ElementRef>('dropZone');
	selectedPrompt = prompts[0];
	prompts = prompts;
	fileList: FileItem[] = [];
	models: Model[] = [
		{ name: 'o1-preview' },
		{ name: 'o1-mini' },
		{ name: 'gpt-4o' },
		{ name: 'gpt-4o-mini' },
		{ name: 'gpt-4-turbo' },
	];
	selectedModel: Model = this.models[0];
	modelOrder = ['o1-preview', 'gpt-4o', 'o1-mini', 'gpt-4o-mini', 'gpt-4-turbo'];
	allFileHandles: FileItem[] = [];

	constructor() {
		addIcons({ createOutline, cloudDoneOutline, documentOutline, folderOutline, send });
	}

	ngOnInit(): void {
		this.loadModels();
	}

	async start() {
		this.isProcessing = true;
		for (const fileItem of this.fileList) {
			try {
				const file = await fileItem.handle.getFile();
				const content = await file.text();
				const fileExt = fileItem.path.split('.').pop();
				this.selectedPrompt = prompts.find(p => p.name === fileExt) || this.prompts[0];
				const finalPrompt = `${this.selectedPrompt.prompt}\n\nCode for ${fileItem.handle.name}\n\n${content}`;
				fileItem.status = 'inprogress';
				let res = await this.githubCopilotService.chat(finalPrompt, this.selectedModel.name);
				if (res.status === 429) {
					const model = this.models.find(m => m.name === this.selectedModel.name);
					if (model) {
						model.retryAfter = res.retryAfter;
						model.retryAfterCreatedAt = new Date().toISOString();
						localStorage.setItem('models', JSON.stringify(this.models));
						this.loadModels();
					}
					throw new Error('Rate limit exceeded. Please try again later.');
				}
				res = this.extractCode(res);
				fileItem.status = 'done';
				fileItem.res = res;
				await this.writeToFile(fileItem);
			} catch (error: any) {
				console.error(error);
				fileItem.status = 'error';
				fileItem.res = error.message;
			}
		}
		this.isProcessing = false;
	}

	private extractCode(response: string): string {
		if (response.startsWith('```')) {
			return response.substring(response.indexOf('\n') + 1, response.length - 3);
		} else {
			const start = response.indexOf('```') + 3;
			const end = response.lastIndexOf('```');
			return response.substring(response.indexOf('\n', start) + 1, end);
		}
	}

	loadModels() {
		const modelsData = localStorage.getItem('models');
		if (modelsData) {
			this.models = (JSON.parse(modelsData) as Model[]).map((model) => {
				if (model.retryAfter && model.retryAfterCreatedAt) {
					const dateTimestamp = new Date(model.retryAfterCreatedAt).getTime() + parseInt(model.retryAfter) * 1000;
					const date = new Date(dateTimestamp).toLocaleTimeString();
					model.retryAfterDate = date;
					model.disabled = dateTimestamp > Date.now();
				}
				return model;
			}).sort((a, b) => this.modelOrder.indexOf(a.name) - this.modelOrder.indexOf(b.name));
			this.selectedModel = this.models.find(m => !m.disabled) || this.models[0];
		}
	}

	async writeToFile(fileItem: FileItem) {
		const writable = await fileItem.handle.createWritable();
		await writable.write(fileItem.res || '');
		await writable.close();
	}

	handleDrag(event: DragEvent, action: 'over' | 'leave') {
		event.preventDefault();
		this.dropZoneRef()?.nativeElement.classList[action === 'over' ? 'add' : 'remove']('drag-over');
	}

	async onDrop(event: DragEvent) {
		event.preventDefault();
		this.handleDrag(event, 'leave');
		const items = event.dataTransfer?.items ?? [];
		const fileHandles: FileItem[] = [];
		for (const item of Array.from(items)) {
			if (item.kind === 'file') {
				const handle = await item.getAsFileSystemHandle();
				if (!handle) {
					console.error('File handle not found');
					continue;
				}
				if (handle.kind === 'directory') {
					if (items.length > 1) throw new Error('Select only one directory');
					await this.getFilesFromDirectory(handle as FileSystemDirectoryHandle, fileHandles, handle.name);
				} else {
					await this.requestPermission(handle);
					fileHandles.push({ handle: handle as FileSystemFileHandle, path: handle.name });
				}
			}
		}
		this.allFileHandles = fileHandles;
		this.updateFileList();
	}

	private async getFilesFromDirectory(directoryHandle: FileSystemDirectoryHandle, fileHandles: FileItem[], path: string) {
		for await (const [name, handle] of directoryHandle) {
			const currentPath = `${path}/${name}`;
			if (handle.kind === 'file') {
				await this.requestPermission(handle);
				fileHandles.push({ handle, path: currentPath });
			} else if (handle.kind === 'directory') {
				await this.getFilesFromDirectory(handle, fileHandles, currentPath);
			}
		}
	}

	async selectFolder() {
		try {
			const directoryHandle = await window.showDirectoryPicker({ id: 'ai-agent' });
			const fileHandles: FileItem[] = [];
			await this.getFilesFromDirectory(directoryHandle, fileHandles, directoryHandle.name);
			this.allFileHandles = fileHandles;
			this.updateFileList();
		} catch (error) {
			console.error('Error selecting folder:', error);
		}
	}

	async selectFiles() {
		try {
			const handles = await window.showOpenFilePicker({ multiple: true, id: 'ai-agent' });
			const fileHandles: FileItem[] = [];
			for (const handle of handles) {
				await this.requestPermission(handle);
				fileHandles.push({ handle, path: handle.name });
			}
			this.allFileHandles = fileHandles;
			this.updateFileList();
		} catch (error) {
			console.error('Error selecting files:', error);
		}
	}

	private async requestPermission(handle: FileSystemFileHandle | FileSystemDirectoryHandle | FileSystemHandle) {
		const result = await handle.requestPermission({ mode: 'readwrite' });
		if (result !== 'granted') throw new Error('Write permissions not granted');
	}

	updateFileList() {
		const fileType = this.selectedPrompt.name;
		this.fileList = fileType === 'all' ? this.allFileHandles
			: this.allFileHandles.filter(file => file.path.split('.').pop() === fileType);
	}
}

type FileItem = {
	handle: FileSystemFileHandle;
	path: string;
	status?: 'inprogress' | 'done' | 'error';
	res?: string;
};

type Model = {
	name: string;
	retryAfter?: string;
	retryAfterCreatedAt?: string;
	disabled?: boolean;
	retryAfterDate?: string;
};
