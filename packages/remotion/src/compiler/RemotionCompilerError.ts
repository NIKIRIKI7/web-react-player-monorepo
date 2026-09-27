import type { CompilerError } from '../types';

export class RemotionCompilerError extends Error implements CompilerError {
  public readonly type: CompilerError['type'];
  public readonly suggestion?: string | undefined;

  constructor(type: CompilerError['type'], message: string, suggestion?: string) {
    super(message);
    this.type = type;
    this.suggestion = suggestion;
    this.name = 'RemotionCompilerError';
  }
}
