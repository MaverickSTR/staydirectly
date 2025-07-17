import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// Hospitable API version to use
const HOSPITABLE_API_VERSION = "2022-11-01";

// Type definitions for API responses
interface HospitableTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface HospitableCustomer {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a server-side API client for Hospitable with token management
 */
export function createServerApiClient() {
  // State for token storage
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let tokenExpiry: number | null = null;

  // Base axios instance with common settings
  const client = axios.create({
    baseURL: "https://connect.hospitable.com/api/v1",
    headers: {
      "Content-Type": "application/json",
      "Connect-Version": HOSPITABLE_API_VERSION,
    },
  });

  // Add token to requests if available
  client.interceptors.request.use(async (config) => {
    // Check if token is about to expire (within 5 minutes)
    if (tokenExpiry && Date.now() > tokenExpiry - 5 * 60 * 1000) {
      try {
        // Refresh token
        const newTokens = await refreshAccessToken();
        accessToken = newTokens.access_token;
        refreshToken = newTokens.refresh_token;
        tokenExpiry = Date.now() + newTokens.expires_in * 1000;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        // Token refresh failed, proceed with old token or without token
      }
    }

    // Add access token to header if available
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  });

  /**
   * Refresh access token using refresh token
   */
  async function refreshAccessToken(): Promise<HospitableTokenResponse> {
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      // Get refresh URL from environment or use a default
      const refreshUrl =
        process.env.HOSPITABLE_TOKEN_URL ||
        "https://connect.hospitable.com/api/v1/oauth/token";

      // Include the necessary credentials
      const clientId = process.env.NEXT_PUBLIC_HOSPITABLE_CLIENT_ID;
      const clientSecret = process.env.HOSPITABLE_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw new Error("Missing Hospitable credentials");
      }

      const response = await axios.post(refreshUrl, {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      });

      return response.data;
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw error;
    }
  }

  /**
   * Set tokens from an authorization code exchange
   * Note: Would later change logic to persist tokens securely in DB
   */
  function setTokens(tokenResponse: HospitableTokenResponse): void {
    accessToken = tokenResponse.access_token;
    refreshToken = tokenResponse.refresh_token;
    tokenExpiry = Date.now() + tokenResponse.expires_in * 1000;
  }

  /**
   * Exchange an authorization code for access and refresh tokens
   */
  async function exchangeCodeForToken(
    code: string
  ): Promise<HospitableTokenResponse> {
    try {
      // Get token URL from environment or use a default
      const tokenUrl =
        process.env.HOSPITABLE_TOKEN_URL ||
        "https://connect.hospitable.com/api/v1/oauth/token";

      // Include the necessary credentials
      const clientId = process.env.NEXT_PUBLIC_HOSPITABLE_CLIENT_ID;
      const clientSecret = process.env.HOSPITABLE_CLIENT_SECRET;
      const redirectUri =
        process.env.NEXT_PUBLIC_HOSPITABLE_REDIRECT_URI ||
        "http://localhost:5000/auth/callback";

      if (!clientId || !clientSecret) {
        throw new Error("Missing Hospitable credentials");
      }

      const response = await axios.post(tokenUrl, {
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      });

      const tokenData = response.data;
      setTokens(tokenData);

      return tokenData;
    } catch (error) {
      console.error("Error exchanging code for token:", error);
      throw error;
    }
  }

  /**
   * Create a new customer in Hospitable
   * Follows API specification: https://connect.hospitable.com/api/v1/customers
   */
  async function createCustomer(
    customerData: any
  ): Promise<HospitableCustomer> {
    try {
      // Validate required fields
      if (!customerData.name) {
        throw new Error("Customer name is required");
      }
      if (!customerData.email) {
        throw new Error("Customer email is required");
      }

      // Hospitable platform token is required for this operation
      const platformToken = process.env.HOSPITABLE_PLATFORM_TOKEN;

      if (!platformToken) {
        throw new Error(
          "Missing HOSPITABLE_PLATFORM_TOKEN environment variable"
        );
      }

      // Generate a valid ID if not provided (alphanumeric, dots, underscores, hyphens only)
      const generateValidId = () => {
        const chars =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < 8; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };

      // Validate and clean the ID (must match pattern: ^[a-zA-Z0-9._-]+)
      let customerId = customerData.id;
      if (!customerId) {
        customerId = generateValidId();
      } else {
        // Clean the ID to match the required pattern
        customerId = customerId.replace(/[^a-zA-Z0-9._-]/g, "");
        if (!customerId || customerId.length === 0) {
          customerId = generateValidId();
        }
      }

      // Prepare customer data according to API specification
      const hospitableCustomerData: any = {
        id: customerId,
        name: customerData.name,
        email: customerData.email,
      };

      // Add optional fields if provided and valid
      if (customerData.phone) {
        // Validate E.164 format (starts with + followed by digits, max 15 digits total)
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (e164Regex.test(customerData.phone)) {
          hospitableCustomerData.phone = customerData.phone;
        } else {
          console.warn(
            `[Hospitable Client] Invalid phone format: ${customerData.phone}. Skipping phone field. Expected E.164 format (e.g., +1234567890)`
          );
        }
      }
      if (customerData.timezone) {
        hospitableCustomerData.timezone = customerData.timezone;
      }

      console.log(
        `[Hospitable Client] Creating customer with ID: ${customerId}`
      );
      console.log(
        `[Hospitable Client] Customer data:`,
        JSON.stringify(hospitableCustomerData, null, 2)
      );

      // Create customer using platform token for authorization
      const response = await axios.post(
        "https://connect.hospitable.com/api/v1/customers",
        hospitableCustomerData,
        {
          headers: {
            "Content-Type": "application/json",
            "Connect-Version": HOSPITABLE_API_VERSION,
            Authorization: `Bearer ${platformToken}`,
          },
        }
      );

      console.log(`[Hospitable Client] Customer created successfully`);
      console.log(
        `[Hospitable Client] Response:`,
        JSON.stringify(response.data, null, 2)
      );

      return response.data;
    } catch (error) {
      console.error("[Hospitable Client] Error creating customer:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      }
      throw error;
    }
  }

  /**
   * Get all listings for a specific customer
   */
  async function getCustomerListings(customerId: string): Promise<any[]> {
    try {
      // Make authenticated request to get customer listings
      console.log(
        `[Hospitable Client] Fetching listings for customer ${customerId}`
      );
      // const response = await client.get(`/customers/${customerId}/listings`);

      const platformToken = process.env.HOSPITABLE_PLATFORM_TOKEN;

      if (!platformToken) {
        throw new Error(
          "Missing HOSPITABLE_PLATFORM_TOKEN environment variable"
        );
      }

      // Create customer using platform token for authorization
      const response = await axios.get(
        `https://connect.hospitable.com/api/v1/customers/${customerId}/listings`,

        {
          headers: {
            "Content-Type": "application/json",
            "Connect-Version": HOSPITABLE_API_VERSION,
            Authorization: `Bearer ${platformToken}`,
          },
        }
      );

      console.log(
        `[Hospitable Client] Got ${
          response.data.data?.length || 0
        } listings for customer ${customerId}`
      );
      // console.log(`[Hospitable Client] Fetched listings for customer ${customerId}:`, response.data.data);

      return response.data.data || [];
    } catch (error) {
      console.error(
        `Error fetching listings for customer ${customerId}:`,
        error
      );
      return [];
    }
  }

  /**
   * Get images for a specific listing
   */
  async function getListingImages(
    customerId: string,
    listingId: string
  ): Promise<any[]> {
    try {
      console.log(
        `[Hospitable Client] Fetching images for listing ${listingId} of customer ${customerId}`
      );

      // Make authenticated request to get listing images
      // const response = await client.get(`/customers/${customerId}/listings/${listingId}/images`);

      const platformToken = process.env.HOSPITABLE_PLATFORM_TOKEN;

      if (!platformToken) {
        throw new Error(
          "Missing HOSPITABLE_PLATFORM_TOKEN environment variable"
        );
      }

      // Create customer using platform token for authorization
      const response = await axios.get(
        `https://connect.hospitable.com/api/v1/customers/${customerId}/listings/${listingId}/images`,

        {
          headers: {
            "Content-Type": "application/json",
            "Connect-Version": HOSPITABLE_API_VERSION,
            Authorization: `Bearer ${platformToken}`,
          },
        }
      );

      // console.log(`[Hospitable Client] Fetched images for listing ${listingId}:`, response.data.data);
      console.log(
        `[Hospitable Client] Got ${
          response.data.data?.length || 0
        } images for listing ${listingId}`
      );

      // Return empty array if no data or images
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching images for listing ${listingId}:`, error);
      return [];
    }
  }

  /**
   * Create an auth code for a customer to start the connection flow
   * API Endpoint: POST https://connect.hospitable.com/api/v1/auth-codes
   * Requires: Bearer token, customer_id, redirect_url
   */
  async function createAuthCode(
    customerId: string,
    redirectUrl: string
  ): Promise<any> {
    try {
      // Hospitable platform token is required for this operation
      const platformToken = process.env.HOSPITABLE_PLATFORM_TOKEN;

      if (!platformToken) {
        throw new Error(
          "Missing HOSPITABLE_PLATFORM_TOKEN environment variable. Please set this in your .env file."
        );
      }

      console.log(
        `[Hospitable Client] Creating auth code for customer: ${customerId}`
      );
      console.log(`[Hospitable Client] Redirect URL: ${redirectUrl}`);
      console.log(
        `[Hospitable Client] Using token: ${platformToken.substring(0, 8)}...`
      );

      const requestPayload = {
        customer_id: customerId,
        redirect_url: redirectUrl,
      };

      console.log(
        `[Hospitable Client] Request payload:`,
        JSON.stringify(requestPayload, null, 2)
      );

      const response = await axios.post(
        "https://connect.hospitable.com/api/v1/auth-codes",
        requestPayload,
        {
          headers: {
            "Content-Type": "application/json",
            "Connect-Version": HOSPITABLE_API_VERSION,
            Authorization: `Bearer ${platformToken}`,
          },
        }
      );

      console.log(
        `[Hospitable Client] ✅ Auth code created successfully for customer ${customerId}`
      );
      console.log(
        `[Hospitable Client] Response:`,
        JSON.stringify(response.data, null, 2)
      );

      return response.data;
    } catch (error) {
      console.error(
        `[Hospitable Client] ❌ Error creating auth code for customer ${customerId}:`
      );

      if (axios.isAxiosError(error)) {
        console.error(`Status: ${error.response?.status}`);
        console.error(`Status Text: ${error.response?.statusText}`);
        console.error(
          `Response Data:`,
          JSON.stringify(error.response?.data, null, 2)
        );
        console.error(
          `Request Headers:`,
          JSON.stringify(error.config?.headers, null, 2)
        );
        console.error(`Request URL:`, error.config?.url);
        console.error(`Request Method:`, error.config?.method?.toUpperCase());
        console.error(
          `Request Data:`,
          JSON.stringify(error.config?.data, null, 2)
        );
      } else {
        console.error(`General Error:`, error);
      }

      throw error;
    }
  }

  /**
   * Get all customers from Hospitable
   */
  async function getAllCustomers(): Promise<HospitableCustomer[]> {
    try {
      console.log(`[Hospitable Client] Fetching all customers`);

      const platformToken = process.env.HOSPITABLE_PLATFORM_TOKEN;

      if (!platformToken) {
        throw new Error(
          "Missing HOSPITABLE_PLATFORM_TOKEN environment variable"
        );
      }

      const response = await axios.get(
        "https://connect.hospitable.com/api/v1/customers",
        {
          headers: {
            "Content-Type": "application/json",
            "Connect-Version": HOSPITABLE_API_VERSION,
            Authorization: `Bearer ${platformToken}`,
          },
        }
      );

      return response.data.data || [];
    } catch (error) {
      console.error("[Hospitable Client] Error fetching all customers:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        console.error("Response headers:", error.response.headers);
      }
      throw error;
    }
  }

  /**
   * Get user profile data for authenticated user
   */
  async function getUserProfile(): Promise<any> {
    try {
      // Make authenticated request to get user profile
      const response = await client.get("/accounts/me");

      return response.data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  }

  // Return the client API
  return {
    exchangeCodeForToken,
    refreshAccessToken,
    createCustomer,
    createAuthCode,
    getAllCustomers,
    getCustomerListings,
    getListingImages,
    getUserProfile,
  };
}
