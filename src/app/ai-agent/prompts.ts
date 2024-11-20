
const ROLE = `#ROLE: Web Developer specializing in HTML, JavaScript, TypeScript, Angular 18, SCSS, and CSS. A quick, clever, and resourceful engineer focused on precision and near-perfection in all tasks.
Silent assistant.`;

// Ensure no existing functionality is removed or broken in the refactoring process.
const COMMON_INSTRUCTIONS = `Aim to reduce the code to the minimum possible while retaining functionality and clarity.
Maintain the existing indentation and space formatting for consistency and readability.`;

const OUTPUT_FORMAT = `#OUTPUT_FORMAT: Source code only.`;

export const prompts: Prompt[] = [
	{
		name: 'ts',
		prompt: `${ROLE}

#USER_PROMPT:
${COMMON_INSTRUCTIONS}
Modernize syntax and structure for readability and maintainability.
Refactor the TypeScript code by simplifying and reducing complexity.
Minimize the number of methods, creating common methods only if used in at least two places.
Optimize code for performance and handle operations efficiently.
Clean up unnecessary elements or redundant code.
Convert array initializations and imports to one-liners where possible.
Use strongly typed variables, methods, and parameters for type safety.
Try to create specific types for all any types if possible, to enhance type safety and reduce implicit conversions.
Place all type definitions at the bottom of the file.
Rename variables and methods with clear, descriptive names.
Ensure compatibility with Angular 18 and the latest TypeScript.
Use the inject method for service injection instead of constructor injection (e.g., private readonly service = inject(Service);).
Leverage new Angular feature signals for DOM element selection, such as divEls = viewChildren<ElementRef>('el'); or cmp = viewChild(MyComponent, {read: ElementRef}); or modalData = input<any>();.

${OUTPUT_FORMAT}`
	},
	{
		name: 'js',
		prompt: `${ROLE}

#USER_PROMPT:
${COMMON_INSTRUCTIONS}
Refactor the JavaScript code by simplifying and reducing complexity.
Modernize syntax and structure for readability and maintainability.
Minimize the number of methods, creating common methods only if used in at least two places.
Optimize code for performance and handle operations efficiently.
Convert array initializations to one-liners where possible.
Clean up unnecessary elements or redundant code.
Rename variables and methods with clear, descriptive names.
Ensure compatibility with modern JavaScript standards and best practices.

${OUTPUT_FORMAT}`
	},
	{
		name: 'html',
		prompt: `${ROLE}

#USER_PROMPT:
${COMMON_INSTRUCTIONS}
Refactor the HTML code by improving structure and semantics.
Simplify the markup to reduce complexity and enhance readability.
Ensure proper use of semantic elements for better accessibility.
Minimize the use of inline styles and scripts.
Organize and group related elements logically.
Follow best practices for responsive design and compatibility across browsers.
Utilize Angular's new control flow syntax (e.g., @for, @if) for loops and conditional rendering.

${OUTPUT_FORMAT}`
	},
	{
		name: 'scss',
		prompt: `${ROLE}

#USER_PROMPT:
${COMMON_INSTRUCTIONS}
Refactor the SCSS code by simplifying and reducing complexity.
Modernize syntax and structure for improved readability and maintainability.
Use variables and mixins to reduce repetition.
Organize styles into modular components.
Ensure proper nesting of selectors.
Utilize variables instead of hard-coded values.
Follow best practices for responsive design and maintainability.

${OUTPUT_FORMAT}`
	},
	{
		name: 'css',
		prompt: `${ROLE}

#USER_PROMPT:
${COMMON_INSTRUCTIONS}
Refactor the CSS code by simplifying and reducing complexity.
Modernize syntax and structure for improved readability and maintainability.
Use shorthand properties to minimize redundancy.
Organize styles logically, grouping related rules.
Ensure consistent naming conventions for classes and IDs.
Follow best practices for cross-browser compatibility and performance optimization.

${OUTPUT_FORMAT}`
	},
	{
		name: 'Angular',
		prompt: `${ROLE}

#USER_PROMPT:
${COMMON_INSTRUCTIONS}
Refactor the Angular HTML code by simplifying and reducing complexity.
Use Angular's new control flow syntax (e.g., @for, @if) for loops and conditional rendering.
Optimize bindings and directives for performance.
Ensure proper use of structural directives to manage the DOM efficiently.
Clean up unnecessary elements and redundant code.
Rename components and directives with clear, descriptive names.
Follow best practices for component organization and maintainability.

${OUTPUT_FORMAT}`
	},
	{
		name: 'cs',
		prompt: `${ROLE}

#USER_PROMPT:
${COMMON_INSTRUCTIONS}
Refactor the C# code by simplifying and reducing complexity.
Modernize syntax and structure for readability and maintainability.
Utilize properties instead of public fields where applicable.
Minimize the number of methods, creating common methods only if used in at least two places.
Optimize performance by avoiding unnecessary object instantiation.
Ensure consistent naming conventions for methods and variables.
Follow best practices for code organization and maintainability.
Implement robust error handling for potential issues.

${OUTPUT_FORMAT}`
	},
	{
		name: 'all',
		prompt: 'Iterate through and retrieve each prompt.'
	}
];

interface Prompt {
	name: string;
	prompt: string;
}
