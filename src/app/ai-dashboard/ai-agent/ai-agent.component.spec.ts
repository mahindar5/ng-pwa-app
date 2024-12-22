import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonItem, IonItemGroup, IonLabel, IonMenu, IonMenuButton, IonProgressBar, IonSplitPane, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIService, FileService, ProcessingStrategy } from '@mahindar5/common-lib';
import { AiAgentComponent } from './ai-agent.component';
import { AiProcessingService } from '../ai-processing.service';
import { SettingsComponent } from '../settings/settings.component';
import { AlertController } from '@ionic/angular';

describe('AiAgentComponent', () => {
	let component: AiAgentComponent;
	let fixture: ComponentFixture<AiAgentComponent>;
	let fileService: jasmine.SpyObj<FileService>;
	let aiProcessingService: jasmine.SpyObj<AiProcessingService>;
	let alertController: jasmine.SpyObj<AlertController>;

	beforeEach(async () => {
		const fileServiceSpy = jasmine.createSpyObj('FileService', ['updateFileList', 'handleDrop', 'selectFolder', 'selectFiles', 'writeToFile', 'saveFileAs']);
		const aiProcessingServiceSpy = jasmine.createSpyObj('AiProcessingService', ['processFiles']);
		const alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);

		await TestBed.configureTestingModule({
			declarations: [],
			imports: [
				FormsModule, IonHeader, IonCheckbox, IonProgressBar, IonToolbar, IonTitle,
				IonButton, IonIcon, IonContent, IonItem, IonLabel, IonTextarea, IonButtons,
				IonMenuButton, IonSplitPane, IonMenu, SettingsComponent, IonItemGroup
			],
			providers: [
				{ provide: FileService, useValue: fileServiceSpy },
				{ provide: AiProcessingService, useValue: aiProcessingServiceSpy },
				{ provide: AlertController, useValue: alertControllerSpy },
				AIService
			]
		}).compileComponents();

		fixture = TestBed.createComponent(AiAgentComponent);
		component = fixture.componentInstance;
		fileService = TestBed.inject(FileService) as jasmine.SpyObj<FileService>;
		aiProcessingService = TestBed.inject(AiProcessingService) as jasmine.SpyObj<AiProcessingService>;
		alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should initialize with default settings', () => {
		expect(component.isMultiSelectMode()).toBe(true);
		expect(component.allFiles().length).toBe(0);
		expect(component.currentPrompt().prompt).toContain('#INSTRUCTIONS:');
	});

	it('should call aiProcessingService.processFiles on onProcessFiles', async () => {
		component.allFiles.set([{ path: 'test.txt', selected: true, status: 'unmodified', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: '' }]);
		component.settings.set({ ...component.settings(), processingStrategy: ProcessingStrategy.Combined });
		await component.onProcessFiles();
		expect(aiProcessingService.processFiles).toHaveBeenCalled();
	});

	it('should select all files when onSelectAllFiles is called and not all files are selected', () => {
		component.allFiles.set([{ path: 'test1.txt', selected: false, status: 'unmodified', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: '' }, { path: 'test2.txt', selected: true, status: 'unmodified', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: '' }]);
		component.onSelectAllFiles();
		expect(component.allFiles().every(file => file.selected)).toBe(true);
	});

	it('should deselect all files when onSelectAllFiles is called and all files are selected', () => {
		component.allFiles.set([{ path: 'test1.txt', selected: true, status: 'unmodified', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: '' }, { path: 'test2.txt', selected: true, status: 'unmodified', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: '' }]);
		component.onSelectAllFiles();
		expect(component.allFiles().every(file => !file.selected)).toBe(true);
	});

	it('should add drag-over class on dragover', () => {
		const dragEvent = new DragEvent('dragover');
		component.onDragOver(dragEvent);
		expect(component['dropZoneRef']()?.nativeElement.classList).toContain('drag-over');
	});

	it('should remove drag-over class on dragleave', () => {
		const dragEvent = new DragEvent('dragleave');
		component['dropZoneRef']()?.nativeElement.classList.add('drag-over');
		component.onDragLeave(dragEvent);
		expect(component['dropZoneRef']()?.nativeElement.classList).not.toContain('drag-over');
	});

	it('should call fileService.handleDrop on file drop', async () => {
		const dragEvent = new DragEvent('drop');
		spyOn(component, 'handleFilesUpdate').and.returnValue(Promise.resolve());
		await component.onFileDrop(dragEvent);
		expect(component.handleFilesUpdate).toHaveBeenCalled();
	});

	it('should call fileService.selectFolder on onSelectFolder', async () => {
		spyOn(component, 'handleFilesUpdate').and.returnValue(Promise.resolve());
		await component.onSelectFolder();
		expect(component.handleFilesUpdate).toHaveBeenCalled();
	});

	it('should call fileService.selectFiles on onSelectFiles', async () => {
		spyOn(component, 'handleFilesUpdate').and.returnValue(Promise.resolve());
		await component.onSelectFiles();
		expect(component.handleFilesUpdate).toHaveBeenCalled();
	});

	it('should be disabled when prompt is empty', () => {
		component.currentPrompt.set({ ...component.currentPrompt(), prompt: '' });
		expect(component.isProcessButtonDisabled()).toBe(true);
	});

	it('should be disabled when no files are selected in multi-select mode', () => {
		component.allFiles.set([]);
		expect(component.isProcessButtonDisabled()).toBe(true);
	});

	it('should be disabled when processing is in progress', () => {
		component.isProcessing.set(true);
		expect(component.isProcessButtonDisabled()).toBe(true);
	});

	it('should call fileService.writeToFile on onSaveFile with file handle', async () => {
		const fileItem = { path: 'test.txt', selected: true, status: 'done', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: 'test' };
		await component.onSaveFile(fileItem);
		expect(fileService.writeToFile).toHaveBeenCalledWith(fileItem);
	});

	it('should call fileService.saveFileAs on onSaveFile without file handle', async () => {
		const fileItem = { path: 'test.txt', selected: true, status: 'done', handle: null, directoryHandle: {} as FileSystemDirectoryHandle, code: 'test' };
		await component.onSaveFile(fileItem);
		expect(fileService.saveFileAs).toHaveBeenCalledWith(fileItem);
	});

	it('should call fileService.saveFileAs on onSaveFileAs', async () => {
		const fileItem = { path: 'test.txt', selected: true, status: 'done', handle: null, directoryHandle: {} as FileSystemDirectoryHandle, code: 'test' };
		await component.onSaveFileAs(fileItem);
		expect(fileService.saveFileAs).toHaveBeenCalledWith(fileItem);
	});

	it('should not be able to save all when no files are done', () => {
		component.allFiles.set([{ path: 'test.txt', selected: true, status: 'unmodified', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: '' }]);
		expect(component.canSaveAll()).toBe(false);
	});

	it('should be able to save all when at least one file is done', () => {
		component.allFiles.set([{ path: 'test.txt', selected: true, status: 'done', handle: {} as FileSystemFileHandle, directoryHandle: {} as FileSystemDirectoryHandle, code: '' }]);
		expect(component.canSaveAll()).toBe(true);
	});
});