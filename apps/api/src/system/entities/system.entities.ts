import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;
  @Column({ name: 'actor_id', type: 'uuid', nullable: true }) actorId?: string;
  @Column() action!: string;
  @Column({ nullable: true }) entity?: string;
  @Column({ name: 'entity_id', nullable: true }) entityId?: string;
  @Column({ type: 'jsonb', nullable: true }) meta?: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ nullable: true }) type?: string;
  @Column({ type: 'jsonb', nullable: true }) payload?: Record<string, unknown>;
  @Column({ name: 'read_at', type: 'timestamptz', nullable: true }) readAt?: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
}

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid') // placeholder; key is logical PK
  rowId!: string;
  @Column({ unique: true }) key!: string;
  @Column({ type: 'jsonb', nullable: true }) value?: unknown;
  @CreateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
