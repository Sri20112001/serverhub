import {
  siLinux,
  siUbuntu,
  siDebian,
  siArchlinux,
  siFedora,
  siCentos,
  siRedhat,
  siAlpinelinux,
  siKalilinux,
  siManjaro,
  siOpensuse,
  siRockylinux,
  siAlmalinux,
  siGentoo,
  siRaspberrypi,
  siApple,
  siFreebsd,
  siOpenbsd,
  siAndroid,
  type SimpleIcon,
} from "simple-icons";

export interface OsMeta {
  name: string;
  family: "linux" | "windows" | "darwin" | "bsd" | "other";
  color?: string;
}

export function detectOs(rawOs = "", rawPlatform = ""): {
  meta: OsMeta;
  iconType: "simple" | "windows" | "terminal" | "monitor";
  simpleIcon?: SimpleIcon;
} {
  const os = rawOs.toLowerCase().trim();
  const platform = rawPlatform.toLowerCase().trim();
  const combo = `${os} ${platform}`;

  // 1. Windows variants
  if (combo.includes("win")) {
    let name = "Windows";
    if (combo.includes("server")) name = "Windows Server";
    else if (combo.includes("11")) name = "Windows 11";
    else if (combo.includes("10")) name = "Windows 10";
    return {
      meta: { name, family: "windows", color: "#0078D4" },
      iconType: "windows",
    };
  }

  // 2. macOS / Darwin
  if (combo.includes("darwin") || combo.includes("mac") || combo.includes("apple")) {
    return {
      meta: { name: "macOS", family: "darwin", color: "#999999" },
      iconType: "simple",
      simpleIcon: siApple,
    };
  }

  // 3. Linux distributions
  if (combo.includes("ubuntu")) {
    return {
      meta: { name: "Ubuntu", family: "linux", color: `#${siUbuntu.hex}` },
      iconType: "simple",
      simpleIcon: siUbuntu,
    };
  }
  if (combo.includes("debian")) {
    return {
      meta: { name: "Debian", family: "linux", color: `#${siDebian.hex}` },
      iconType: "simple",
      simpleIcon: siDebian,
    };
  }
  if (combo.includes("arch")) {
    return {
      meta: { name: "Arch Linux", family: "linux", color: `#${siArchlinux.hex}` },
      iconType: "simple",
      simpleIcon: siArchlinux,
    };
  }
  if (combo.includes("fedora")) {
    return {
      meta: { name: "Fedora", family: "linux", color: `#${siFedora.hex}` },
      iconType: "simple",
      simpleIcon: siFedora,
    };
  }
  if (combo.includes("centos")) {
    return {
      meta: { name: "CentOS", family: "linux", color: `#${siCentos.hex}` },
      iconType: "simple",
      simpleIcon: siCentos,
    };
  }
  if (combo.includes("rhel") || combo.includes("redhat") || combo.includes("red hat")) {
    return {
      meta: { name: "Red Hat Enterprise Linux", family: "linux", color: `#${siRedhat.hex}` },
      iconType: "simple",
      simpleIcon: siRedhat,
    };
  }
  if (combo.includes("alpine")) {
    return {
      meta: { name: "Alpine Linux", family: "linux", color: `#${siAlpinelinux.hex}` },
      iconType: "simple",
      simpleIcon: siAlpinelinux,
    };
  }
  if (combo.includes("kali")) {
    return {
      meta: { name: "Kali Linux", family: "linux", color: `#${siKalilinux.hex}` },
      iconType: "simple",
      simpleIcon: siKalilinux,
    };
  }
  if (combo.includes("manjaro")) {
    return {
      meta: { name: "Manjaro", family: "linux", color: `#${siManjaro.hex}` },
      iconType: "simple",
      simpleIcon: siManjaro,
    };
  }
  if (combo.includes("suse")) {
    return {
      meta: { name: "openSUSE", family: "linux", color: `#${siOpensuse.hex}` },
      iconType: "simple",
      simpleIcon: siOpensuse,
    };
  }
  if (combo.includes("rocky")) {
    return {
      meta: { name: "Rocky Linux", family: "linux", color: `#${siRockylinux.hex}` },
      iconType: "simple",
      simpleIcon: siRockylinux,
    };
  }
  if (combo.includes("alma")) {
    return {
      meta: { name: "AlmaLinux", family: "linux", color: `#${siAlmalinux.hex}` },
      iconType: "simple",
      simpleIcon: siAlmalinux,
    };
  }
  if (combo.includes("gentoo")) {
    return {
      meta: { name: "Gentoo", family: "linux", color: `#${siGentoo.hex}` },
      iconType: "simple",
      simpleIcon: siGentoo,
    };
  }
  if (combo.includes("raspbian") || combo.includes("raspberry")) {
    return {
      meta: { name: "Raspberry Pi OS", family: "linux", color: `#${siRaspberrypi.hex}` },
      iconType: "simple",
      simpleIcon: siRaspberrypi,
    };
  }

  // 4. BSD family
  if (combo.includes("freebsd")) {
    return {
      meta: { name: "FreeBSD", family: "bsd", color: `#${siFreebsd.hex}` },
      iconType: "simple",
      simpleIcon: siFreebsd,
    };
  }
  if (combo.includes("openbsd")) {
    return {
      meta: { name: "OpenBSD", family: "bsd", color: `#${siOpenbsd.hex}` },
      iconType: "simple",
      simpleIcon: siOpenbsd,
    };
  }
  if (combo.includes("bsd")) {
    return {
      meta: { name: rawPlatform.toUpperCase() || "BSD", family: "bsd", color: "#AB2B28" },
      iconType: "terminal",
    };
  }

  // 5. Android
  if (combo.includes("android")) {
    return {
      meta: { name: "Android", family: "other", color: `#${siAndroid.hex}` },
      iconType: "simple",
      simpleIcon: siAndroid,
    };
  }

  // 6. Generic Linux
  if (combo.includes("linux")) {
    const titleCase = rawPlatform ? rawPlatform.charAt(0).toUpperCase() + rawPlatform.slice(1) : "Linux";
    return {
      meta: { name: titleCase, family: "linux", color: `#${siLinux.hex}` },
      iconType: "simple",
      simpleIcon: siLinux,
    };
  }

  return {
    meta: { name: rawPlatform || rawOs || "Unknown OS", family: "other" },
    iconType: "monitor",
  };
}
