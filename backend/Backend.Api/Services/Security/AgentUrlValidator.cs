namespace Backend.Api.Services.Security;

public class AgentUrlValidator
{
    private static readonly HashSet<string> BlockedHosts = new(StringComparer.OrdinalIgnoreCase)
    {
        "localhost",
        "127.0.0.1",
        "[::1]",
        "0.0.0.0",
        "169.254.169.254"
    };

    public bool IsSafeUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return false;

        // Ensure it's an absolute URI
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return false;

        // Only allow HTTP/HTTPS
        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            return false;

        // Check against explicit blacklist
        if (BlockedHosts.Contains(uri.Host))
            return false;

        // Check for IPv4 Loopback (127.0.0.0/8)
        if (uri.HostNameType == UriHostNameType.IPv4 && uri.Host.StartsWith("127."))
            return false;

        // Check for IPv6 Loopback (::1 is handled by blacklist, but others might exist)
        // Standard loopback is ::1.

        // Check for Link-Local / Metadata (169.254.0.0/16)
        if (uri.HostNameType == UriHostNameType.IPv4 && uri.Host.StartsWith("169.254."))
            return false;

        return true;
    }
}
