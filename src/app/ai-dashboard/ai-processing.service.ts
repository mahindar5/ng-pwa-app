import { inject, signal } from '@angular/core';
import { AIResponse, AIService, FileItem, FileService, ProcessingStrategy, Settings } from '@mahindar5/common-lib';


export class AiProcessingService {
	private readonly fileService = inject(FileService);
	private readonly aiservice = inject(AIService);
	processingStrategy = signal<ProcessingStrategy>(ProcessingStrategy.Combined);

	setProcessingStrategy(strategy: ProcessingStrategy): void {
		this.processingStrategy.set(strategy);
	}

	async processFiles(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemObject: (fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string) => void,
		processResponse: (response: AIResponse) => void
	): Promise<void> {
		const strategy = this.processingStrategy();

		switch (strategy) {
			case ProcessingStrategy.Individual:
				await this.processFilesIndividually(fileItems, prompt, settings, showAuthenticationAlert, updateFileItemObject, processResponse);
				break;
			case ProcessingStrategy.Combined:
				await this.processFilesCombined(fileItems, prompt, settings, showAuthenticationAlert, updateFileItemObject, processResponse);
				break;
			case ProcessingStrategy.Chat:
				await this.processFilesChat(fileItems, prompt, settings, showAuthenticationAlert, updateFileItemObject, processResponse);
				break;
		}
	}

	private async processFilesIndividually(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemObject: (fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string) => void,
		processResponse: (response: AIResponse) => void
	): Promise<void> {
		for (const fileItem of fileItems) {
			try {
				const file = await fileItem.handle.getFile();
				const content = await file.text();
				const finalPrompt = `${prompt}\n\nCode for ${fileItem.handle.name}\n\n${content}`;

				updateFileItemObject(fileItem, 'inprogress', '');
				const response = await this.aiservice.message(
					finalPrompt,
					settings,
					showAuthenticationAlert
				);

				processResponse(response);
				const message = response.message;
				fileItem.res = this.fileService.extractCode(message);
				updateFileItemObject(fileItem, 'done', fileItem.res);
				await this.fileService.writeToFile(fileItem);
			} catch (error) {
				console.error(error);
				updateFileItemObject(fileItem, 'error', (error as Error).message);
			}
		}
	}

	private async processFilesCombined(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemObject: (fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string) => void,
		processResponse: (response: AIResponse) => void
	): Promise<void> {
		try {
			let filesText = '';
			for await (const fileItem of fileItems) {
				const file = await fileItem.handle.getFile();
				const content = await file.text();
				filesText += `#FILE:${fileItem.path}\n\`\`\`\n${content}\n\`\`\`\n#END_FILE\n`;
				updateFileItemObject(fileItem, 'inprogress', '');
			}

			const combinedPrompt = `${prompt}\n\n${filesText}`;
			const response = await this.aiservice.message(
				combinedPrompt,
				settings,
				showAuthenticationAlert
			);

			processResponse(response);
			this.extractFilesText(response.message, fileItems, updateFileItemObject);

		} catch (error) {
			console.error(error);
			fileItems.forEach(fileItem => updateFileItemObject(fileItem, 'error', (error as Error).message));
		}
	}

	private async extractFilesText(
		message: string,
		fileItems: FileItem[],
		updateFileItemObject: (fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string) => void
	): Promise<void> {
		const fileRegex = /#FILE:(.+?)\n([\s\S]*?)#END_FILE/g;
		let match;

		while ((match = fileRegex.exec(message)) !== null) {
			const filename = match[1].trim();
			const fileItem = fileItems.find(item => item.path === filename);
			const code = this.fileService.extractCode(match[2].trim());
			if (fileItem) {
				fileItem.res = code;
				updateFileItemObject(fileItem, 'done', fileItem.res);
				this.fileService.writeToFile(fileItem);
			} else {
				// Create the file if not found
				const directory = filename.split('/').slice(0, -1).join('/');
				const directoryHandle = fileItems.find(item => item.path.includes(directory))?.directoryHandle;
				if (directoryHandle) {
					const newFileHandle = await directoryHandle.getFileHandle(filename.split('/').pop()!, { create: true });
					const writable = await newFileHandle.createWritable();
					await writable.write(code);
					await writable.close();
					console.log(`File created for ${filename}`);
				} else {
					console.error(`Directory not found for ${filename}`);
				}
			}
		}
	}

	private async processFilesChat(
		fileItems: FileItem[],
		prompt: string,
		settings: Settings,
		showAuthenticationAlert: (response: any) => Promise<boolean>,
		updateFileItemObject: (fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string) => void,
		processResponse: (response: AIResponse) => void
	): Promise<void> {
		try {
			for (const fileItem of fileItems) {
				let filesText = '#Context:\n';
				for await (const fileItem of fileItems) {
					const file = await fileItem.handle.getFile();
					const content = await file.text();
					filesText += `#FILE:${fileItem.path}\n\`\`\`\n${content}\n\`\`\`\n#END_FILE\n`;
				}

				const file = await fileItem.handle.getFile();
				const content = await file.text();
				const filePrompt = `${prompt}\n
				Process the below single file with above context\n
				\n#FILE:${fileItem.path}\n\`\`\`\n${content}\n\`\`\`\n#END_FILE\n`;

				const response = await this.aiservice.chat(
					[
						{ role: 'user', text: filesText, date: new Date() },
						{ role: 'user', text: filePrompt, date: new Date() }
					],
					settings,
					showAuthenticationAlert
				);

				processResponse(response);
				const message = response.message;
				fileItem.res = this.fileService.extractCode(message);
				updateFileItemObject(fileItem, 'done', fileItem.res);
				await this.fileService.writeToFile(fileItem);
			}
		} catch (error) {
			console.error(error);
			fileItems.forEach(fileItem => updateFileItemObject(fileItem, 'error', (error as Error).message));
		}
	}
}
