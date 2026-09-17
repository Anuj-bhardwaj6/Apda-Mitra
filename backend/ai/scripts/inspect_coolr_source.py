import requests
import re

def parse_gpm_coolr():
    url = "https://gpm.nasa.gov/applications/landslides/coolr"
    r = requests.get(url, timeout=10)
    print("Status:", r.status_code)
    # find all hrefs
    links = re.findall(r'href=["\']([^"\']+)["\']', r.text)
    for l in set(links):
        if any(x in l.lower() for x in ["download", "catalog", "zip", "csv", "data", "coolr", "landslide", "viewer", "inventory", "glc", "gsi"]):
            print("Link:", l)

if __name__ == "__main__":
    parse_gpm_coolr()
