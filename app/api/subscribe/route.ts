import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    const API_KEY = process.env.BREVO_API_KEY;
    const LIST_ID = process.env.BREVO_LIST_ID;

    if (!API_KEY) {
      console.error("Newsletter API: Missing Brevo API key");
      return NextResponse.json(
        { error: "Internal server error (missing config)." },
        { status: 500 }
      );
    }

    const payload: any = {
      email,
      updateEnabled: true,
    };

    if (LIST_ID) {
      payload.listIds = [parseInt(LIST_ID)];
    }

    const response = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "api-key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    let data: any = {};
    if (response.status !== 204) {
      data = await response.json().catch((e: any) => {
        return {};
      });
    }

    if (response.ok || response.status === 201 || response.status === 204) {
      return NextResponse.json(
        { message: "Subscribed successfully!" },
        { status: 200 }
      );
    } else {
      if (data.code === "duplicate_parameter") {
        return NextResponse.json(
          { message: "You're already subscribed!" },
          { status: 200 }
        );
      }

      console.error("Newsletter API: Brevo error", data);
      return NextResponse.json(
        { error: data.message || "Failed to subscribe." },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error("Newsletter API: Internal error", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}



