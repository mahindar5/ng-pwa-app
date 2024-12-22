import { inject, signal } from '@angular/core';
import { AIResponse, AIService, FILE_MARKERS, FileItem, FileService, FileStatus, ProcessingStrategy, Settings } from '@mahindar5/common-lib';
import { SettingsService } from './settings/settings.service';

export class AiProcessingService {
	private readonly fileService = inject(FileService);
	private readonly aiservice = inject(AIService);
	private readonly settingsService = inject(SettingsService);

	processingStrategy = signal<ProcessingStrategy>(ProcessingStrategy.Combined);

	setProcessingStrategy(strategy: ProcessingStrategy): void {
		this.processingStrategy.set(strategy);
	}

	async processFiles(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemStatus: (fileItem: FileItem, status: FileStatus, code: string, error: string) => void,
	): Promise<void> {
		const strategy = this.processingStrategy();

		switch (strategy) {
			case ProcessingStrategy.Individual:
				await this.processFilesIndividually(fileItems, prompt, settings, showAuthenticationAlert, updateFileItemStatus);
				break;
			case ProcessingStrategy.Combined:
				await this.processFilesCombined(fileItems, prompt, settings, showAuthenticationAlert, updateFileItemStatus);
				break;
			case ProcessingStrategy.Chat:
				await this.processFilesChat(fileItems, prompt, settings, showAuthenticationAlert, updateFileItemStatus);
				break;
		}
	}

	private async processFilesIndividually(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemStatus: (fileItem: FileItem, status: FileStatus, code: string, error: string) => void,
	): Promise<void> {
		for (const fileItem of fileItems) {
			try {
				const fileContent = await this.fileService.getFileContent(fileItem);
				const finalPrompt = `${prompt}\n\nCode for ${fileItem.handle.name}\n\n${fileContent}`;

				updateFileItemStatus(fileItem, 'inprogress', '', '');
				const response = await this.aiservice.message(
					finalPrompt,
					settings,
					showAuthenticationAlert
				);

				this.processResponse(response, settings);
				const extractedCode = this.fileService.extractCode(response.message);
				updateFileItemStatus(fileItem, 'done', extractedCode, '');
				await this.fileService.writeToFile({ ...fileItem, code: extractedCode });
			} catch (error) {

				console.error(error);
				fileItems.forEach(fileItem => {
					updateFileItemStatus(fileItem, 'error', '', (error as Error).message);
				});
			}
		}
	}

	private async processFilesCombined(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemStatus: (fileItem: FileItem, status: FileStatus, code: string, error: string) => void,
	): Promise<void> {
		try {
			let filesText = '';
			for await (const fileItem of fileItems) {
				const fileContent = await this.fileService.getFileContent(fileItem);
				filesText += `${FILE_MARKERS.FILE_START}${fileItem.path}\n\`\`\`\n${fileContent}\n\`\`\`\n${FILE_MARKERS.FILE_END}\n\n`;
				updateFileItemStatus(fileItem, 'inprogress', '', '');
			}

			const combinedPrompt = `${prompt}\n\n${filesText}`;
			const response = await this.aiservice.message(
				combinedPrompt,
				settings,
				showAuthenticationAlert
			);

			this.processResponse(response, settings);
			await this.extractFilesText(response.message, fileItems, updateFileItemStatus);

		} catch (error) {
			console.error(error);
			fileItems.forEach(fileItem => {
				updateFileItemStatus(fileItem, 'error', '', (error as Error).message);
			});
		}
	}

	private async processFilesChat(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemStatus: (fileItem: FileItem, status: FileStatus, code: string, error: string) => void,
	): Promise<void> {
		try {
			for (const fileItem of fileItems) {
				let filesText = '#Context:\n';
				for await (const currentFile of fileItems) {
					const fileContent = await this.fileService.getFileContent(currentFile);
					filesText += `${FILE_MARKERS.FILE_START}${currentFile.path}\n\`\`\`\n${fileContent}\n\`\`\`\n${FILE_MARKERS.FILE_END}\n\n`;
				}

				const fileContent = await this.fileService.getFileContent(fileItem);
				const filePrompt = `${prompt}\n
                Process the below single file with above context\n
                \n${FILE_MARKERS.FILE_START}${fileItem.path}\n\`\`\`\n${fileContent}\n\`\`\`\n${FILE_MARKERS.FILE_END}\n\n`;

				const response = await this.aiservice.chat(
					[
						{ role: 'user', text: filesText, date: new Date() },
						{ role: 'user', text: filePrompt, date: new Date() }
					],
					settings,
					showAuthenticationAlert
				);

				this.processResponse(response, settings);
				const extractedCode = this.fileService.extractCode(response.message);
				updateFileItemStatus(fileItem, 'done', extractedCode, '');
				await this.fileService.writeToFile({ ...fileItem, code: extractedCode });
			}
		} catch (error) {

			console.error(error);
			fileItems.forEach(fileItem => {
				updateFileItemStatus(fileItem, 'error', '', (error as Error).message);
			});
		}
	}

	processResponse(response: AIResponse, settings: Settings): void {
		if (response.retryAfter) {
			const model = settings.models.find(m => m.name === settings.model.name && m.org === settings.model.org);
			if (model) {
				model.retryAfter = response.retryAfter.retryAfter;
				model.retryAfterCreatedAt = new Date().toISOString();
				this.settingsService.saveSettings({ ...this.settingsService.settings(), models: settings.models });
			}
			throw new Error('Rate limit exceeded. Please try again later.');
		}
	}

	private async extractFilesText(
		message: string,
		fileItems: FileItem[],
		updateFileItemStatus: (fileItem: FileItem, status: FileStatus, code: string, error: string) => void
	): Promise<void> {
		const fileRegex = new RegExp(`${FILE_MARKERS.FILE_START}(.+?)\n([\\s\\S]*?)${FILE_MARKERS.FILE_END}`, 'g');
		let match;
		(window as any)['combinedMessage'] = message;

		while ((match = fileRegex.exec(message)) !== null) {
			const filename = match[1].trim();
			const fileItem = fileItems.find(item => item.path === filename);
			try {
				const code = this.fileService.extractCode(match[2].trim());
				if (fileItem) {
					updateFileItemStatus(fileItem, 'done', code, '');
					this.fileService.writeToFile({ ...fileItem, code: code });
				} else {
					await this.createNewFile(filename, code, fileItems, updateFileItemStatus);
				}
			} catch (error) {
				if (fileItem) {
					updateFileItemStatus(fileItem, 'error', '', (error as Error).message);
				}
			}
		}
	}

	private async createNewFile(
		filename: string,
		code: string,
		fileItems: FileItem[],
		updateFileItemStatus: (fileItem: FileItem, status: FileStatus, code: string, error: string) => void
	): Promise<void> {
		const directory = filename.split('/').slice(0, -1).join('/');
		const directoryHandle = fileItems.find(item => item.path.split('/').length === 2 && item.path.startsWith(directory + '/'))?.directoryHandle;
		const newFileItem: FileItem = {
			path: filename,
			status: 'done',
			code: code,
			selected: false
		} as FileItem;
		if (directoryHandle) {
			const newFileHandle = await directoryHandle.getFileHandle(filename.split('/').pop()!, { create: true });
			newFileItem.handle = newFileHandle;
			newFileItem.directoryHandle = directoryHandle;
			this.fileService.writeToFile({ ...newFileItem, code: code });
			updateFileItemStatus(newFileItem, 'done', '', code);
			console.log(`File created for ${filename}`);
		} else {
			console.error(`Directory not found for ${filename}`);
			updateFileItemStatus(newFileItem, 'error', code, `Directory not found for ${filename}`);
		}
	}
}
