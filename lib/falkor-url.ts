export interface FalkorEndpoint {
  username: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
}

/**
 * Parse a FalkorDB connection URL.
 * `falkors://` and `rediss://` are TLS. The port is taken from the URL
 * (FalkorDB Cloud uses a non-standard port). The raw string is never logged.
 */
export function parseFalkorUrl(raw: string): FalkorEndpoint {
  const value = raw.trim();
  const schemeMatch = value.match(/^(falkors|falkor|rediss|redis):\/\/([\s\S]+)$/i);
  if (!schemeMatch) {
    throw new Error("FALKORDB_URL scheme is not supported");
  }
  const scheme = schemeMatch[1].toLowerCase();
  const tls = scheme === "falkors" || scheme === "rediss";
  let rest = schemeMatch[2].split(/[?#]/)[0];

  let userinfo: string | null = null;
  const at = rest.lastIndexOf("@");
  if (at >= 0) {
    userinfo = rest.slice(0, at);
    rest = rest.slice(at + 1);
  }

  let host = rest;
  let port: number | null = null;
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    if (end < 0) throw new Error("FALKORDB_URL host is invalid");
    const after = host.slice(end + 1);
    host = host.slice(1, end);
    if (after.startsWith(":")) {
      port = Number(after.slice(1).split("/")[0]);
    }
  } else {
    const slash = host.indexOf("/");
    if (slash >= 0) host = host.slice(0, slash);
    const colon = host.lastIndexOf(":");
    if (colon >= 0) {
      port = Number(host.slice(colon + 1));
      host = host.slice(0, colon);
    }
  }

  if (!host) throw new Error("FALKORDB_URL host is missing");
  if (port === null) port = tls ? 6380 : 6379;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("FALKORDB_URL port is invalid");
  }

  let username = "";
  let password = "";
  if (userinfo) {
    const colon = userinfo.indexOf(":");
    if (colon === -1) username = decodeURIComponent(userinfo);
    else {
      username = decodeURIComponent(userinfo.slice(0, colon));
      password = decodeURIComponent(userinfo.slice(colon + 1));
    }
  }

  return { username, password, host, port, tls };
}
