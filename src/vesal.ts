type IVesalResponse = {
	status: number;
	messages: any[];
};

/**
 * The Vesal API Class
 * @author Shahab Movahhedi
 * @see {@link https://shmovahhedi.com Shahab Movahhedi's Website}
 * @see {@link https://github.com/movahhedi/vesal vesal's Repository}
 * @license MIT
 */
export class Vesal {
	public readonly apiUrl = "https://sms.vesal.com/api/http/sms/v2";
	private username: string;
	private domain: string;
	private password: string;
	private from: string;
	private authHeader: string;

	constructor(username: string, password: string, domain: string, from: string) {
		this.username = username || "";
		this.password = password;
		this.domain = domain;
		this.from = from;

		this.authHeader =
			"Basic " +
			Buffer.from(`${this.username}/${this.domain}:${this.password}`).toString(
				"base64",
			);

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
		method: "GET" | "POST" = "GET",
		data?: object,
	): Promise<any> {
		let response: Response, responseBody: any;

		try {
			response = await fetch(`${this.apiUrl}/${urlSuffix}`, {
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					Authorization: this.authHeader,
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

		if (typeof responseBody?.status === "undefined") {
			throw new VesalError(undefined, "The server didn't respond correctly");
		}

		if (responseBody.status === 0) {
			return responseBody;
		}

		if (Object.keys(vesalErrors).includes("" + responseBody.status)) {
			throw new VesalError(responseBody.status);
		}

		return responseBody;
	}

	async Send({
		recipients,
		messages,
		encodings,
		uids,
		udhs,
	}: {
		recipients: string | string[];
		messages: string | string[];
		encodings?: Encoding | Encoding[];
		uids?: number[];
		udhs?: string[];
	}): Promise<ISendResponseWithCount> {
		if (!recipients || !messages) {
			throw new VesalError(
				undefined,
				"recipients and messages should not be empty",
			);
		}

		if (typeof recipients === "string") {
			recipients = [recipients];
		}
		if (typeof messages === "string") {
			messages = [messages];
		}

		if (
			!messages.length ||
			(recipients.length !== messages.length && messages.length !== 1)
		) {
			throw new VesalError(
				undefined,
				"recipients and messages should have the same length",
			);
		}

		// const senders = messages.map(() => this.from);
		const senders = Array(recipients.length).fill(this.from);

		if (encodings && !Array.isArray(encodings)) {
			encodings = Array(recipients.length).fill(encodings);
		}

		const sendData = {
			recipients,
			messages,
			senders,
			encodings,
			uids,
			udhs,
		};

		const result: IVesalResponse_Send = await this.Api("send", "POST", sendData);

		const messagesMutated: ISentMessage[] = [];

		let successCount: number = 0,
			failCount: number = 0;

		result.messages.map((messageResult: ISentMessage) => {
			if (messageResult.status === 0) {
				const obj = { ...messageResult, message: "پیام با موفقیت رسید" };
				messagesMutated.push(obj);
				successCount++;
			} else {
				const obj = {
					...messageResult,
					message: GetStatusText(messageResult.status),
				};
				messagesMutated.push(obj);
				failCount++;
			}
		});

		return {
			...result,
			messages: messagesMutated,
			count: {
				success: successCount,
				fail: failCount,
			},
		};
	}

	async Statuses(mids: number[]): Promise<IVesalResponse_Statuses> {
		return await this.Api(`statuses/${mids.join(",")}`);
	}

	async Mid(uid: number): Promise<IVesalResponse_Mid> {
		const result = (await this.Api(`mid/${uid}`)) as IVesalResponse_Mid;
		return {
			...result,
			mid: result.mid || undefined,
		};
	}

	async Balance(): Promise<IVesalResponse_Balance> {
		return await this.Api("balance");
	}

	async ReceivedMessages(
		count: number = 100,
	): Promise<IVesalResponse_ReceivedMessages> {
		return await this.Api(`messages/${count}`);
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

type IStatusCode = 0 | keyof typeof vesalErrors;

interface IVesalResponse_Base {
	status: IStatusCode;
}

interface IVesalResponse_Balance extends IVesalResponse_Base {
	balance: number | null;
}

interface IVesalResponse_Send extends IVesalResponse_Base {
	messages: ISentMessage[];
}

interface IVesalResponse_Statuses extends IVesalResponse_Base {
	dlrs: {
		/** شناسه یکتای پیامک */
		mid: number;
		/** وضعیت */
		status: number;
		/** `yyyy-mm-dd hh:mm:ss` */
		date: string;
	}[];
}

interface IVesalResponse_ReceivedMessages extends IVesalResponse_Base {
	messages: {
		/** پیام */
		body: string;
		/** فرستنده */
		senderNumber: string;
		/** گیرنده */
		recipientNumber: string;
		/** `yyyy-mm-dd hh:mm:ss` */
		date: string;
	}[];
}

interface IVesalResponse_Mid extends IVesalResponse_Base {
	mid: number | undefined;
}

interface ISendResponseWithCount extends IVesalResponse_Send {
	count: {
		success: number;
		fail: number;
	};
}

interface ISentMessage {
	/** نشانگر وضعیت درخواست. مقدار صفر به معنای انجام بدون خطای درخواست و هر عدد غیر از صفر کد خطای مربوطه است. */
	status: IStatusCode;

	/** شناسه یکتای پیامک */
	id: number;

	/** شناسه‌ی یکتای کاربر */
	userId: number;

	/** تعداد بخش‌های پیامک */
	parts: number;

	/** تعرفه */
	tariff: number;

	/** `DEFAULT` for English (ASCII), `UCS2` for Persian */
	alphabet: "DEFAULT" | "UCS2";

	/** گیرنده */
	recipient: string;
}

export const enum Encoding {
	/** تشخیص خودکار زبان پیامک (پیش فرض) */
	Auto = 0,
	/** فارسی */
	Persian = 2,
	/** 8bit */
	EightBit = 5,
	/** Binary */
	Binary = 6,
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

export const vesalErrors = {
	1: "شماره گیرنده نادرست است",
	2: "شماره فرستنده نادرست است",
	3: "پارامتر encoding نامعتبر است. (بررسی صحت و هم‌خوانی متن پیامک با encoding انتخابی)",
	4: "پارامتر mclass نامعتبر است",
	6: "پارامتر UDH نامعتبر است",
	13: "محتویات پیامک (ترکیب UDH و متن) خالی است. (بررسی دوباره‌ی متن پیامک و پارامتر UDH)",
	14: "مانده اعتبار ریالی مورد نیاز برای ارسال پیامک کافی نیست",
	15: "سرور در هنگام ارسال پیام مشغول برطرف نمودن ایراد داخلی بوده است. (ارسال مجدد درخواست)",
	16: "حساب غیرفعال است. (تماس با واحد فروش سیستم‌های ارتباطی)",
	17: "حساب منقضی شده است. (تماس با واحد فروش سیستم‌های ارتباطی)",
	18: "نام کاربری و یا کلمه عبور نامعتبر است. (بررسی مجدد نام کاربری و کلمه عبور)",
	19: "درخواست معتبر نیست. (ترکیب نام کاربری، رمز عبور و دامنه اشتباه است. تماس با واحد فروش برای دریافت کلمه عبور جدید)",
	20: "شماره فرستنده به حساب تعلق ندارد",
	22: "این سرویس برای حساب فعال نشده است",
	23: "در حال حاضر امکان پردازش درخواست جدید وجود ندارد، لطفا دوباره سعی کنید. (ارسال مجدد درخواست)",
	24: "شناسه پیامک معتبر نیست. (ممکن است شناسه پیامک اشتباه و یا متعلق به پیامکی باشد که بیش از یک روز از ارسال آن گذشته)",
	25: "نام متد درخواستی معتبر نیست. (بررسی نگارش نام متد با توجه به بخش متدها در این راهنما)",
	27: "شماره گیرنده در لیست سیاه اپراتور قرار دارد. (ارسال پیامک‌های تبلیغاتی برای این شماره امکان‌پذیر نیست)",
	28: "شماره گیرنده، بر اساس پیش‌شماره در حال حاضر در مگفا مسدود است",
	29: "آدرس IP مبدا، اجازه دسترسی به این سرویس را ندارد",
	30: "تعداد بخش‌های پیامک بیش از حد مجاز استاندارد (۲۶۵ عدد) است",
	31: "داده‌های موردنیاز برای ارسال کافی نیستند. (اصلاح HTTP Request)",
	101: "طول آرایه پارامتر messageBodies با طول آرایه گیرندگان تطابق ندارد",
	102: "طول آرایه پارامتر messageClass با طول آرایه گیرندگان تطابق ندارد",
	103: "طول آرایه پارامتر senderNumbers با طول آرایه گیرندگان تطابق ندارد",
	104: "طول آرایه پارامتر udhs با طول آرایه گیرندگان تطابق ندارد",
	105: "طول آرایه پارامتر priorities با طول آرایه گیرندگان تطابق ندارد",
	106: "آرایه‌ی گیرندگان خالی است",
	107: "طول آرایه پارامتر گیرندگان بیشتر از طول مجاز است",
	108: "آرایه‌ی فرستندگان خالی است",
	109: "طول آرایه پارامتر encoding با طول آرایه گیرندگان تطابق ندارد",
	110: "طول آرایه پارامتر checkingMessageIds با طول آرایه گیرندگان تطابق ندارد",
} as const;

export const messageStatuses = {
	[-1]: "شناسه موجود نیست (شناسه نادرست یا گذشت بیش از ۲۴ ساعت از ارسال پیامک)",
	0: "وضعیتی دریافت نشده",
	1: "رسیده به گوشی",
	2: "نرسیده به گوشی",
	8: "رسیده به مخابرات",
	16: "نرسیده به مخابرات",
} as const;

export default Vesal;
