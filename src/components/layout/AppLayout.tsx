import { useEffect, useState } from "react";
import { NavLink as RouterNavLink, Outlet, useLocation } from "react-router-dom";
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Burger,
  Group,
  Indicator,
  Menu,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconChartBar,
  IconClipboardCheck,
  IconClockHour4,
  IconLanguage,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconListDetails,
  IconLogout,
  IconPlus,
  IconSettings,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { initialsFromName } from "../../lib/format";
import { useT, type Lang, type TKey } from "../../i18n";
import { demandService } from "../../data/demandService";
import abbottLogo from "../../assets/abbott-logo.png";
import classes from "./AppLayout.module.css";

interface NavItem {
  to: string;
  labelKey: TKey;
  icon: Icon;
  end?: boolean;
  badge?: number;
}

function pageTitleKey(path: string): TKey {
  if (path === "/") return "nav_dashboard";
  if (path.startsWith("/demandas/nova")) return "newDemand";
  if (path.startsWith("/demandas")) return "nav_demandas";
  if (path.startsWith("/kanban")) return "nav_kanban";
  if (path.startsWith("/scoreboard")) return "nav_scoreboard";
  if (path.startsWith("/sponsors")) return "nav_sponsors";
  if (path.startsWith("/aprovacoes")) return "nav_aprovacoes";
  if (path.startsWith("/capacity")) return "nav_capacity";
  if (path.startsWith("/admin")) return "nav_admin";
  return "appName";
}

export function AppLayout() {
  const user = useCurrentUser();
  const loc = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  const { t, lang, setLang } = useT();
  const { signOut } = useAuth();
  const [aprovacoesPendentes, setAprovacoesPendentes] = useState(0);

  // Conta quantas demandas aguardam aprovação do usuário logado
  useEffect(() => {
    let cancelled = false;
    function refresh() {
      demandService
        .list()
        .then((items) => {
          if (cancelled) return;
          const userKey = user.name.toLowerCase();
          const n = items.filter((d) => {
            const next = d.aprovacoes.find((a) => a.status === "pendente");
            if (!next) return false;
            return next.responsavel.toLowerCase().includes(userKey);
          }).length;
          setAprovacoesPendentes(n);
        })
        .catch(() => {});
    }
    refresh();
    const id = window.setInterval(refresh, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [user.name, loc.pathname]);

  const NAV_MAIN: NavItem[] = [
    { to: "/", labelKey: "nav_dashboard", icon: IconLayoutDashboard, end: true },
    { to: "/demandas", labelKey: "nav_demandas", icon: IconListDetails },
    { to: "/kanban", labelKey: "nav_kanban", icon: IconLayoutKanban },
    { to: "/scoreboard", labelKey: "nav_scoreboard", icon: IconChartBar },
    { to: "/sponsors", labelKey: "nav_sponsors", icon: IconUsers },
    {
      to: "/aprovacoes",
      labelKey: "nav_aprovacoes",
      icon: IconClipboardCheck,
      badge: aprovacoesPendentes,
    },
    { to: "/capacity", labelKey: "nav_capacity", icon: IconClockHour4 },
  ];
  const NAV_ADMIN: NavItem[] = [
    { to: "/admin", labelKey: "nav_admin", icon: IconSettings },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 268,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" gap="sm" wrap="nowrap" justify="space-between">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} size="lg" truncate>
              {t(pageTitleKey(loc.pathname))}
            </Text>
          </Group>
          <Group gap="xs">
            <Indicator
              disabled={aprovacoesPendentes === 0}
              label={aprovacoesPendentes}
              size={16}
              color="red"
              offset={4}
            >
              <ActionIcon
                variant="default"
                size="lg"
                component="a"
                href="#/aprovacoes"
                aria-label="Aprovações pendentes"
              >
                <IconBell size={18} />
              </ActionIcon>
            </Indicator>
            <Menu shadow="md" width={170} position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label={t("language")}>
                  <IconLanguage size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{t("language")}</Menu.Label>
                <Menu.Item
                  onClick={() => setLang("pt")}
                  rightSection={lang === "pt" ? "✓" : null}
                >
                  Português 🇧🇷
                </Menu.Item>
                <Menu.Item
                  onClick={() => setLang("en")}
                  rightSection={lang === "en" ? "✓" : null}
                >
                  English 🇺🇸
                </Menu.Item>
                <Menu.Item
                  onClick={() => setLang("es")}
                  rightSection={lang === "es" ? "✓" : null}
                >
                  Español 🇪🇸
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar bg="abbott.9" withBorder={false}>
        <Stack gap={3} p="md" h="100%">
          <div className={classes.brand}>
            <div className={classes.logoBox}>
              <img src={abbottLogo} alt="Abbott" className={classes.logoImg} />
            </div>
            <div className={classes.brand1}>{t("appName")}</div>
            <div className={classes.brandSub}>{t("appTag")}</div>
          </div>

          <RouterNavLink to="/demandas/nova" className={classes.cta} onClick={close}>
            <IconPlus size={17} stroke={2.5} />
            <span>{t("newDemand")}</span>
          </RouterNavLink>

          {NAV_MAIN.map((n) => (
            <RouterNavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={close}
              className={({ isActive }) =>
                isActive
                  ? `${classes.navItem} ${classes.navItemActive}`
                  : classes.navItem
              }
            >
              <n.icon size={19} stroke={1.7} />
              <span>{t(n.labelKey)}</span>
              {(n.badge ?? 0) > 0 && (
                <Badge size="sm" color="red" variant="filled" ml="auto">
                  {n.badge}
                </Badge>
              )}
            </RouterNavLink>
          ))}

          <div className={classes.navSection}>{t("nav_admin_section")}</div>
          {NAV_ADMIN.map((n) => (
            <RouterNavLink
              key={n.to}
              to={n.to}
              onClick={close}
              className={({ isActive }) =>
                isActive
                  ? `${classes.navItem} ${classes.navItemActive}`
                  : classes.navItem
              }
            >
              <n.icon size={19} stroke={1.7} />
              <span>{t(n.labelKey)}</span>
            </RouterNavLink>
          ))}

          <div className={classes.userCard}>
            <Avatar src={user.photoUrl} radius="xl" size={40} color="abbott.4" variant="filled">
              {initialsFromName(user.name)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text className={classes.userName} truncate>
                {user.name}
              </Text>
              <Text className={classes.userMail} truncate>
                {user.email}
              </Text>
            </div>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={() => {
                signOut();
                window.location.hash = "#/login";
              }}
              title="Sair"
              aria-label="Sair"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <IconLogout size={16} />
            </ActionIcon>
          </div>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main bg="gray.0">
        <div className="page-fade" key={loc.pathname}>
          <Outlet />
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

// Avoid TS6133 — Lang only re-exported for callers
export type { Lang };
