import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export default class Settings {
	@PrimaryColumn()
	placeId!: string;

	@Column("simple-json")
	settings!: {
		[key: string]: unknown;
	};
}
