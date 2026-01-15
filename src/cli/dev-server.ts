import * as fs from 'fs';
import * as path from 'path';
import { Compiler } from '../compiler/index.js';

export interface DevServerOptions {
  root: string;
  port: number;
  strict?: boolean;
}

export class DevServer {
  private options: DevServerOptions;
  private compiler: Compiler;
  private watchers: Map<string, fs.FSWatcher> = new Map();

  constructor(options: DevServerOptions) {
    this.options = options;
    this.compiler = new Compiler();
  }

  async start(): Promise<void> {
    console.log(`\n🚀 Aura Dev Server`);
    console.log(`   Root: ${this.options.root}`);
    console.log(`   Port: ${this.options.port}`);
    console.log(`   Strict: ${this.options.strict || false}\n`);

    this.watchFiles();

    console.log('✅ Server ready');
    console.log(`   http://localhost:${this.options.port}\n`);
    console.log('Watching for changes...\n');
  }

  private watchFiles(): void {
    const watchDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const watcher = fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.aura')) return;

        const filePath = path.join(dir, filename);
        
        if (eventType === 'change') {
          this.handleFileChange(filePath);
        }
      });

      this.watchers.set(dir, watcher);
    };

    watchDir(this.options.root);
  }

  private handleFileChange(filePath: string): void {
    console.log(`\n📝 ${path.relative(this.options.root, filePath)} changed`);

    try {
      const source = fs.readFileSync(filePath, 'utf-8');
      const result = this.compiler.compile(source, {
        filename: filePath,
        strict: this.options.strict
      });

      if (result.errors.length > 0) {
        console.error('\n❌ Compilation failed:');
        result.errors.forEach(error => {
          console.error(`  ${error.line}:${error.column} - ${error.message}`);
        });
        return;
      }

      if (result.warnings.length > 0) {
        console.warn('\n⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.warn(`  ${warning.line}:${warning.column} - ${warning.message}`);
        });
      }

      const outputPath = filePath.replace(/\.aura$/, '.js');
      fs.writeFileSync(outputPath, result.code, 'utf-8');

      console.log('✅ Compiled successfully');
      console.log('🔄 Hot reload triggered\n');
    } catch (error) {
      console.error('Error:', error);
    }
  }

  stop(): void {
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();
  }
}
