#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Compiler } from '../compiler/index.js';
import { DevServer } from './dev-server.js';
import { Linter } from './linter.js';
import { Formatter } from './formatter.js';

const COMMANDS = {
  compile: 'Compile Aura files to JavaScript',
  dev: 'Start development server with hot reload',
  build: 'Build for production',
  lint: 'Lint Aura files',
  format: 'Format Aura files',
  init: 'Initialize a new Aura project',
  help: 'Show help message'
};

interface CLIOptions {
  input?: string;
  output?: string;
  watch?: boolean;
  strict?: boolean;
  minify?: boolean;
  explain?: boolean;
  port?: number;
  fix?: boolean;
}

class CLI {
  private args: string[];
  private options: CLIOptions = {};

  constructor(args: string[]) {
    this.args = args;
    this.parseOptions();
  }

  async run(): Promise<void> {
    const command = this.args[0];

    if (!command || command === 'help') {
      this.showHelp();
      return;
    }

    switch (command) {
      case 'compile':
        await this.compile();
        break;
      case 'dev':
        await this.dev();
        break;
      case 'build':
        await this.build();
        break;
      case 'lint':
        await this.lint();
        break;
      case 'format':
        await this.format();
        break;
      case 'init':
        await this.init();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        this.showHelp();
        process.exit(1);
    }
  }

  private async compile(): Promise<void> {
    const input = this.options.input || this.args[1];
    
    if (!input) {
      console.error('Error: Input file required');
      console.log('Usage: aura compile <input> [options]');
      process.exit(1);
    }

    if (!fs.existsSync(input)) {
      console.error(`Error: File not found: ${input}`);
      process.exit(1);
    }

    const source = fs.readFileSync(input, 'utf-8');
    const compiler = new Compiler();

    console.log(`Compiling ${input}...`);

    const result = compiler.compile(source, {
      filename: input,
      strict: this.options.strict,
      minify: this.options.minify,
      explain: this.options.explain
    });

    if (result.errors.length > 0) {
      console.error('\n❌ Compilation failed:\n');
      result.errors.forEach(error => {
        console.error(`  ${error.line}:${error.column} - ${error.message}`);
      });
      process.exit(1);
    }

    if (result.warnings.length > 0) {
      console.warn('\n⚠️  Warnings:\n');
      result.warnings.forEach(warning => {
        console.warn(`  ${warning.line}:${warning.column} - ${warning.message}`);
      });
    }

    const output = this.options.output || input.replace(/\.aura$/, '.js');
    fs.writeFileSync(output, result.code, 'utf-8');

    console.log(`\n✅ Compiled successfully to ${output}`);

    if (this.options.explain && result.explanation) {
      console.log('\n' + result.explanation);
    }
  }

  private async dev(): Promise<void> {
    const port = this.options.port || 3000;
    const root = this.options.input || process.cwd();

    console.log(`Starting development server on port ${port}...`);

    const server = new DevServer({
      root,
      port,
      strict: this.options.strict
    });

    await server.start();
  }

  private async build(): Promise<void> {
    const input = this.options.input || 'src';
    const output = this.options.output || 'dist';

    console.log('Building for production...');

    if (!fs.existsSync(input)) {
      console.error(`Error: Input directory not found: ${input}`);
      process.exit(1);
    }

    if (!fs.existsSync(output)) {
      fs.mkdirSync(output, { recursive: true });
    }

    const files = this.findAuraFiles(input);
    const compiler = new Compiler();
    let errorCount = 0;
    let warningCount = 0;

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf-8');
      const result = compiler.compile(source, {
        filename: file,
        strict: true,
        minify: true
      });

      errorCount += result.errors.length;
      warningCount += result.warnings.length;

      if (result.errors.length > 0) {
        console.error(`\n❌ ${file}:`);
        result.errors.forEach(error => {
          console.error(`  ${error.line}:${error.column} - ${error.message}`);
        });
        continue;
      }

      const relativePath = path.relative(input, file);
      const outputPath = path.join(output, relativePath.replace(/\.aura$/, '.js'));
      const outputDir = path.dirname(outputPath);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(outputPath, result.code, 'utf-8');
      console.log(`✅ ${relativePath}`);
    }

    console.log(`\nBuild complete: ${files.length} files`);
    if (warningCount > 0) {
      console.warn(`⚠️  ${warningCount} warnings`);
    }
    if (errorCount > 0) {
      console.error(`❌ ${errorCount} errors`);
      process.exit(1);
    }
  }

  private async lint(): Promise<void> {
    const input = this.options.input || 'src';
    const files = this.findAuraFiles(input);
    const linter = new Linter();

    console.log('Linting files...\n');

    let errorCount = 0;
    let warningCount = 0;

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf-8');
      const result = linter.lint(source, { filename: file });

      if (result.errors.length > 0 || result.warnings.length > 0) {
        console.log(`${file}:`);
        
        result.errors.forEach(error => {
          console.error(`  ${error.line}:${error.column} - error: ${error.message}`);
          errorCount++;
        });

        result.warnings.forEach(warning => {
          console.warn(`  ${warning.line}:${warning.column} - warning: ${warning.message}`);
          warningCount++;
        });

        console.log('');
      }
    }

    if (errorCount === 0 && warningCount === 0) {
      console.log('✅ No issues found');
    } else {
      console.log(`Found ${errorCount} errors and ${warningCount} warnings`);
      if (errorCount > 0) {
        process.exit(1);
      }
    }
  }

  private async format(): Promise<void> {
    const input = this.options.input || 'src';
    const files = this.findAuraFiles(input);
    const formatter = new Formatter();

    console.log('Formatting files...\n');

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf-8');
      const formatted = formatter.format(source);

      if (this.options.fix) {
        fs.writeFileSync(file, formatted, 'utf-8');
        console.log(`✅ ${file}`);
      } else {
        if (source !== formatted) {
          console.log(`❌ ${file} (needs formatting)`);
        }
      }
    }

    if (!this.options.fix) {
      console.log('\nRun with --fix to apply formatting');
    }
  }

  private async init(): Promise<void> {
    const projectName = this.args[1] || 'my-aura-app';
    const projectPath = path.join(process.cwd(), projectName);

    if (fs.existsSync(projectPath)) {
      console.error(`Error: Directory ${projectName} already exists`);
      process.exit(1);
    }

    console.log(`Creating new Aura project: ${projectName}...`);

    fs.mkdirSync(projectPath);
    fs.mkdirSync(path.join(projectPath, 'src'));
    fs.mkdirSync(path.join(projectPath, 'public'));

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'aura dev',
        build: 'aura build',
        lint: 'aura lint',
        format: 'aura format --fix'
      },
      dependencies: {
        '@aura/runtime': '^0.1.0'
      },
      devDependencies: {
        'aura-lang': '^0.1.0'
      }
    };

    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2),
      'utf-8'
    );

    const exampleComponent = `component Counter:
  state count = 0
  
  on click => count = count + 1
  
  animate click:
    scale: 1.1
  
  role "application"
  label "Counter application"
  
  button onclick=handleClick: "Count: {count}"
`;

    fs.writeFileSync(
      path.join(projectPath, 'src', 'Counter.aura'),
      exampleComponent,
      'utf-8'
    );

    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName}</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>`;

    fs.writeFileSync(
      path.join(projectPath, 'public', 'index.html'),
      indexHtml,
      'utf-8'
    );

    console.log(`\n✅ Project created successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${projectName}`);
    console.log(`  npm install`);
    console.log(`  npm run dev`);
  }

  private findAuraFiles(dir: string): string[] {
    const files: string[] = [];

    const walk = (currentPath: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.aura')) {
          files.push(fullPath);
        }
      }
    };

    if (fs.statSync(dir).isFile()) {
      return [dir];
    }

    walk(dir);
    return files;
  }

  private parseOptions(): void {
    for (let i = 1; i < this.args.length; i++) {
      const arg = this.args[i];

      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const nextArg = this.args[i + 1];

        if (nextArg && !nextArg.startsWith('--')) {
          (this.options as any)[key] = nextArg;
          i++;
        } else {
          (this.options as any)[key] = true;
        }
      }
    }
  }

  private showHelp(): void {
    console.log('Aura - A declarative UI language\n');
    console.log('Usage: aura <command> [options]\n');
    console.log('Commands:');
    
    for (const [command, description] of Object.entries(COMMANDS)) {
      console.log(`  ${command.padEnd(12)} ${description}`);
    }

    console.log('\nOptions:');
    console.log('  --input      Input file or directory');
    console.log('  --output     Output file or directory');
    console.log('  --strict     Enable strict mode');
    console.log('  --minify     Minify output');
    console.log('  --explain    Show compilation explanation');
    console.log('  --port       Development server port (default: 3000)');
    console.log('  --fix        Auto-fix issues (format command)');
  }
}

const cli = new CLI(process.argv.slice(2));
cli.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
