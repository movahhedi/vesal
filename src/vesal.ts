/**
 * The Vesal API Class
 * @author Shahab Movahhedi
 * @see {@link https://shmovahhedi.com Shahab Movahhedi's Website}
 * @see {@link https://github.com/movahhedi/vesal vesal's Repository}
 * @license MIT
 */
export class Vesal {
	public readonly apiUrl = "http://vesal.armaghan.net:8080/rest";
	private username: string;
	private password: string;
	private from: string;

	constructor(username: string, password: string, from: string) {
		this.username = username || "";
		this.password = password;
		this.from = from;

		return this;
	}

	/**
	 * Make an API request to the Vesal API
	 * @private
	 * @param {string} urlSuffix - The URL suffix for the API endpoint
	 * @param {("GET"|"POST")} [method="GET"] - The HTTP method to use for the request
	 * @param {object|null} [data=null] - The data to send with the request
	 * @returns {Promise} The response from the API
	 */
	private async Api(
		urlSuffix: string,
		method: "GET" | "POST" = "POST",
		data?: object,
	): Promise<any> {
		let response: Response, responseBody: any;

		data = {
			...data,
			username: this.username,
			password: this.password,
		};

		try {
			response = await fetch(`${this.apiUrl}/${urlSuffix}`, {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				method,
				body: data && JSON.stringify(data),
			});
		} catch (error) {
			throw new VesalError(undefined, "Server connection failed");
		}

		try {
			responseBody = await response.json();
		} catch (error) {
			throw new VesalError(undefined, "The server didn't respond correctly");
		}

		if (!responseBody.references) {
			throw new VesalError(undefined, "The server didn't respond correctly");
		}

		return responseBody;
	}

	async Send({
		recipients,
		messages,
		from,
	}: {
		recipients: string | string[];
		messages: string | string[];
		from?: string | string[];
	}): Promise<IVesalResponse_Send_WithCount> {
		if (!recipients || !messages) {
			throw new VesalError(
				undefined,
				"recipients and messages should not be empty",
			);
		}

		if (typeof recipients === "string") {
			recipients = [recipients];
		}

		if (!from) {
			from = this.from;
		}

		const isManyToMany = Array.isArray(messages) || Array.isArray(from);

		if (isManyToMany) {
			if (!recipients.length) {
				throw new VesalError(
					undefined,
					"recipients and messages should have the same length",
				);
			}
			if (Array.isArray(messages) && !messages.length) {
				throw new VesalError(
					undefined,
					"recipients and messages should have the same length",
				);
			}

			if (typeof messages === "string") {
				// messages = recipients.map(() => messages);
				messages = Array(recipients.length).fill(messages);
			}
			if (typeof from === "string") {
				// from = recipients.map(() => from);
				from = Array(recipients.length).fill(from);
			}

			if (
				recipients.length !== messages.length ||
				recipients.length !== from.length
			) {
				throw new VesalError(
					undefined,
					"recipients and messages should have the same length",
				);
			}
		}

		const sendData = {
			destinations: recipients,
			...(isManyToMany ? { originators: from } : { originator: from }),
			...(isManyToMany ? { contents: messages } : { content: messages }),
		};

		const result: IVesalResponse_Send = await this.Api(
			isManyToMany ? "ManyToMany" : "OneToMany",
			"POST",
			sendData,
		);

		let successCount: number = 0,
			failCount: number = 0;

		result.references?.map((messageResult) => {
			if (messageResult) {
				successCount++;
			} else {
				failCount++;
			}
		});

		return {
			...result,
			references: result.references || [],
			count: {
				success: successCount,
				fail: failCount,
			},
		};
	}

	async GetMessageStatus(
		referencesIds: number[],
	): Promise<IVesalResponse_MessageState> {
		return await this.Api("messageState", "POST", {
			referenceids: referencesIds,
		});
	}

	async GetReceivedMessages(): Promise<IVesalResponse_ReceivedMessages> {
		return await this.Api("pullReceivedMessages");
	}

	async GetReceivedMessagesCount(): Promise<IVesalResponse_ReceivedMessagesCount> {
		return await this.Api("receivedMessageCount");
	}

	async GetUserInfo(): Promise<IVesalResponse_UserInfo> {
		return await this.Api("userInfo");
	}
}

export class VesalError extends Error {
	status: keyof typeof vesalErrors | undefined;

	constructor(statusParam: number | undefined, messageParam?: string) {
		let message: string, status: keyof typeof vesalErrors | undefined;

		if (statusParam && Object.keys(vesalErrors).includes("" + statusParam)) {
			message = GetStatusText(statusParam);
			status = statusParam as any;
		} else {
			message = messageParam || "Unknown Vesal error";
			status = undefined;
		}

		super(message);

		this.message = message;
		this.status = status;
	}
}

interface IVesalResponse_Base {
	errorModel: {
		errorCode: number;
		timestamp: string | number | null;
	};
}

interface IVesalResponse_Send extends IVesalResponse_Base {
	references: (number | Omit<keyof typeof vesalErrors, 0>)[];
}

interface IVesalResponse_Send_WithCount extends IVesalResponse_Send {
	count: {
		success: number;
		fail: number;
	};
}

interface IVesalResponse_MessageState extends IVesalResponse_Base {
	states: {
		id: number;
		state: number;
	}[];
}
interface IVesalResponse_ReceivedMessages extends IVesalResponse_Base {
	messageModels: {
		originator: string;
		destination: string;
		content: string;
	}[];
}
interface IVesalResponse_ReceivedMessagesCount extends IVesalResponse_Base {
	count: number;
}
interface IVesalResponse_UserInfo extends IVesalResponse_Base {
	user: {
		credit: number;
		deliveryUrl: unknown;
		receiveUrl: unknown;
		iPs: string[];
		numbers: string[];
		id: number;
		username: string;
		password: unknown;
		firstName: unknown;
		lastName: unknown;
		mobile: unknown;
		email: unknown;
		nationalId: number;
		expirationDate: string;
		active: boolean;
		deleted: boolean;
		dbProxyStandalone: boolean;
		insertDate: unknown;
		updateDate: unknown;
		customer: unknown;
		roles: unknown;
	};
}

export function GetStatusText(status: number) {
	if (status === 0) {
		return "success";
	}
	if (Object.keys(vesalErrors).includes("" + status)) {
		return vesalErrors[status];
	}
	return "";
}

export const messageStates = {
	0: "پیامک در صف ارسال قرار دارد",
	1: "ارسال شده",
	2: "پیامک به موبایل گیرنده تحویل شده است",
	3: "پیامک به موبایل گیرنده تحویل نشده است",
	4: "وضعیت نامشخص",
	5: "پیامک توسط وب سرویس به شرکت ارمغان راه طلایی رسیده است",
	6: "پیام از سمت اپراتور لغو شده است",
	7: "پیام از سمت اپراتور منقضی شده است",
	8: "پیام از سمت اپراتور reject شده است",
} as const;

export const vesalErrors = {
	0: "عملیات با موفقیت انجام شد",
	[-100]: "refrenceId مورد نظر یافت نشد",
	[-101]: "احراز هویت کاربر موفقیت آمیز نبود",
	[-102]: "نام کاربری یافت نشد",
	[-103]: "شماره originator اشتباه یا در بازه شماره های کاربر نیست",
	[-104]: "اعتبار کم است",
	[-105]: "فرمت درخواست اشتباه است",
	[-106]: "تعداد refrenceId ها بیش از 1000 عدد است",
	[-107]: "شماره گیرنده پیامک اشتباه است",
	[-109]: "تاریخ انقضای حساب کاربری فرارسیده است",
	[-110]: "درخواست از ip مجاز کاربر ارسال نشده است",
	[-111]: "شماره گیرنده در بلک لیست قرار دارد",
	[-112]: "حساب مشتری فعال نیست",
	[-115]: "فرمت UDH اشتباه است",
	[-117]: "مقدار mclass وارد شده اشتباه است",
	[-118]: "شماره پورت وارد شده صحیح نیست",
	[-119]: "کاربر به سرویس مورد نظر دسترسی ندارد",
	[-120]: "پیام ارسال شده دارای هیچ شماره معتبری نیست",
	[-200]: "خطای داخلی در پایگاه داده رخ داده است",
	[-201]: "خطای نامشخص داخل پایگاه داده",
	[-137]: "پیام نباید حاوی کلمات غیرمجاز می باشد",
} as const;

export default Vesal;
