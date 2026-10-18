import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "../users/user.entity.js";

export type VacationRequestStatus = "Pending" | "Approved" | "Rejected";


@Entity({ name: "vacation_requests" })
@Index("idx_vacation_requests_user_dates", ["userId", "startDate", "endDate"])
@Index("idx_vacation_requests_status_created", ["status", "createdAt"])
@Index("idx_vacation_requests_created", ["createdAt"])
@Index("idx_vacation_requests_user_created", ["userId", "createdAt"])
//Its good to index these columns for faster queries on:
// 1. User's vacation requests within a date range
// 2. Vacation requests by status and creation date
// 3. Recently created vacation requests
// 4. One user's requests, newest first (validator's user filter)
export class VacationRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "start_date", type: "date" })
  startDate!: Date;

  @Column({ name: "end_date", type: "date" })
  endDate!: Date;

  @Column({ type: "text", nullable: true })
  reason!: string | null;

  @Column({ type: "varchar", length: 20 })
  status!: VacationRequestStatus;

  @Column({ type: "text", nullable: true })
  comments!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
