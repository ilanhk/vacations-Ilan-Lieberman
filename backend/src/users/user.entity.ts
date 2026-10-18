import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

export type UserRole = "Requester" | "Validator";

//Nothing to index here.

@Entity({ name: "users" })
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @Column({ type: "varchar", length: 20 })
  role!: UserRole;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
