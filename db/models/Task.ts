import {
  Table,
  Column,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
} from 'sequelize-typescript';

export enum TaskState {
  Pending = 'pending',
  InProgress = 'in_progress',
  Done = 'done',
  Idle = 'idle',
}

@Table({ tableName: 'tasks' })
export class Task extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  declare id: number;

  @Column({ type: DataType.STRING(50), allowNull: false })
  kind!: string;

  @Column({ type: DataType.STRING(50), allowNull: false })
  state!: TaskState;

  @Column({ type: DataType.JSON, allowNull: true })
  metadata?: object;
}
