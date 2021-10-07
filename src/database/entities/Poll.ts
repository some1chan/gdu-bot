import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export default class Poll {
	@PrimaryColumn()
	channelId!: string;

	@PrimaryColumn()
	messageId!: string;

	@Column("simple-json")
	pollData!: {
		anon?: boolean;
		singleVote?: boolean;
		question: string;
		userOptions: PollUserData[];
	};

	@Column()
	deleteDate!: Date;
}

export interface PollUserData {
	option: string;
	emote: string;
	users: string[];
}
