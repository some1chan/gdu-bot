import { Platform } from "@framedjs/core";
import { Column, Entity, PrimaryColumn } from "typeorm"

@Entity()
export default class QAFriday {
	@PrimaryColumn()
	placeId!: string;

	@PrimaryColumn()
	platform!: Platform;

	@Column()
	queue?: string;
} 