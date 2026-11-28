const dashboardPath = /^\/dashboard(?:\/[a-z0-9_-]+)*\/?$/i;

export function dashboardReturnTo(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f\\#]/.test(value)) return null;
  return dashboardPath.test(value.split("?")[0]) ? value : null;
}

export function loginUrl(pathname, search) {
  const query = new URLSearchParams();
  const destination = dashboardReturnTo(pathname + search);
  if (destination) query.set("returnTo", destination);
  const gym = new URLSearchParams(search).get("gym");
  if (gym) query.set("gym", gym);
  return query.size ? "/login?" + query : "/login";
}
