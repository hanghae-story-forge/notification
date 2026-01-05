import { GenerationId } from '../shared';
import { Generation } from './generation.entity';

export abstract class IGenerationRepository {
  abstract save(generation: Generation): Promise<Generation>;
  abstract findById(id: GenerationId): Promise<Generation | null>;
  abstract findActive(): Promise<Generation | null>;
  abstract findAll(): Promise<Generation[]>;
  abstract findByName(name: string): Promise<Generation | null>;
  abstract delete(id: GenerationId): Promise<void>;
}
