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
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconBell,
  IconChartBar,
  IconChecks,
  IconClockHour4,
  IconInbox,
  IconLayoutDashboard,
  IconLayoutKanban,
  IconListDetails,
  IconLogout,
  IconPlugConnected,
  IconPlus,
  IconPresentation,
  IconSettings,
  type Icon,
} from "@tabler/icons-react";
import { useAuth } from "../../auth/AuthContext";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { initialsFromName } from "../../lib/format";
import { useT, type Lang, type TKey } from "../../i18n";
import { demandService } from "../../data/demandService";
import { precisaDeMim } from "../../domain/workflow";
import { Role, ROLE_LABEL, ROLE_COLOR } from "../../domain/roles";
import { ErrorBoundary } from "../ErrorBoundary";
import abbottLogo from "../../assets/abbott-logo.png";
import classes from "./AppLayout.module.css";

interface NavItem {
  to: string;
  label: string;
  icon: Icon;
  end?: boolean;
  badge?: number;
  roles?: Role[];
}

function pageTitle(path: string): string {
  if (path === "/") return "Home";
  if (path.startsWith("/demandas/nova")) return "New request";
  if (path.startsWith("/demandas")) return "Requests";
  if (path.startsWith("/kanban")) return "Board";
  if (path.startsWith("/scoreboard")) return "Score Board";
  if (path.startsWith("/aprovacoes")) return "My inbox";
  if (path.startsWith("/approvers")) return "Approvers Status";
  if (path.startsWith("/capacity")) return "Capacity";
  if (path.startsWith("/relatorio")) return "Monthly report";
  if (path.startsWith("/integraciones")) return "ServiceNow";
  if (path.startsWith("/admin")) return "Administration";
  return "Demand Hub";
}

export function AppLayout() {
  const user = useCurrentUser();
  const loc = useLocation();
  const [opened, { toggle, close }] = useDisclosure();
  useT();
  const { signOut } = useAuth();
  const [pendentes, setPendentes] = useState(0);
  const roles = user.roles;

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      demandService
        .list()
        .then((items) => {
          if (cancelled) return;
          setPendentes(items.filter((d) => precisaDeMim(d, roles)).length);
        })
        .catch(() => {});
    }
    refresh();
    const id = window.setInterval(refresh, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [roles, loc.pathname]);

  const isAdmin = roles.includes(Role.Admin);
  const canCreate = roles.includes(Role.Solicitante) || isAdmin;
  const gate = [Role.PMO, Role.Diretor, Role.Sponsor, Role.Admin];

  /* Menú agrupado (análise UX): Demands / Tracking / Administration */
  const NAV_HOME: NavItem[] = [{ to: "/", label: "Home", icon: IconLayoutDashboard, end: true }];
  const NAV_DEMANDS: NavItem[] = [
    { to: "/aprovacoes", label: "My inbox", icon: IconInbox, badge: pendentes },
    { to: "/demandas", label: "All requests", icon: IconListDetails },
    { to: "/kanban", label: "Board", icon: IconLayoutKanban },
  ];
  const NAV_TRACKING: NavItem[] = [
    { to: "/approvers", label: "Approvers Status", icon: IconChecks, roles: gate },
    { to: "/scoreboard", label: "Score Board", icon: IconChartBar, roles: gate },
    { to: "/capacity", label: "Capacity", icon: IconClockHour4, roles: [Role.TechLead, Role.PMO, Role.Admin] },
  ];
  const byRole = (items: NavItem[]) => items.filter((n) => !n.roles || n.roles.some((r) => roles.includes(r)));
  const navDemands = byRole(NAV_DEMANDS);
  const navTracking = byRole(NAV_TRACKING);

  const NAV_ADMIN: NavItem[] = [
    { to: "/relatorio", label: "Monthly report", icon: IconPresentation },
    { to: "/integraciones", label: "ServiceNow", icon: IconPlugConnected },
    { to: "/admin", label: "Administration", icon: IconSettings },
  ];

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${classes.navItem} ${classes.navItemActive}` : classes.navItem;

  return (
    <AppShell
      header={{ height: 62 }}
      navbar={{ width: 264, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header className="glass" withBorder={false} style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}>
        <Group h="100%" px="lg" gap="sm" wrap="nowrap" justify="space-between">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={800} size="lg" truncate>{pageTitle(loc.pathname)}</Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Indicator disabled={pendentes === 0} label={pendentes} size={16} color="grape" offset={4}>
              <ActionIcon variant="default" size="lg" component="a" href="#/aprovacoes" aria-label="Inbox">
                <IconBell size={18} />
              </ActionIcon>
            </Indicator>
            <Group gap={8} wrap="nowrap" visibleFrom="sm">
              <Avatar radius="xl" size={34} variant="gradient" gradient={{ from: "abbott.6", to: "grape.6", deg: 60 }}>
                {initialsFromName(user.name)}
              </Avatar>
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} truncate style={{ maxWidth: 160 }}>{user.name}</Text>
                <Text size="xs" c="dimmed" truncate style={{ maxWidth: 160 }}>{user.cargo}</Text>
              </div>
            </Group>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        withBorder={false}
        style={{
          background:
            "linear-gradient(180deg, var(--mantine-color-abbott-9) 0%, var(--mantine-color-abbott-8) 55%, #3a1d6e 130%)",
        }}
      >
        <Stack gap={3} p="md" h="100%">
          <div className={classes.brand}>
            <div className={classes.logoBox}>
              <img src={abbottLogo} alt="Abbott" className={classes.logoImg} />
            </div>
            <div className={classes.brand1}>Demand Hub</div>
            <div className={classes.brandSub}>by LIT Digitall</div>
          </div>

          {canCreate && (
            <RouterNavLink to="/demandas/nova" className={classes.cta} onClick={close}>
              <IconPlus size={17} stroke={2.5} />
              <span>New request</span>
            </RouterNavLink>
          )}

          {NAV_HOME.map((n) => (
            <RouterNavLink key={n.to} to={n.to} end={n.end} onClick={close} className={navClass}>
              <n.icon size={19} stroke={1.7} />
              <span>{n.label}</span>
            </RouterNavLink>
          ))}

          <div className={classes.navSection}>Demands</div>
          {navDemands.map((n) => (
            <RouterNavLink key={n.to} to={n.to} end={n.end} onClick={close} className={navClass}>
              <n.icon size={19} stroke={1.7} />
              <span>{n.label}</span>
              {(n.badge ?? 0) > 0 && (
                <Badge size="sm" color="grape" variant="filled" ml="auto">{n.badge}</Badge>
              )}
            </RouterNavLink>
          ))}

          {navTracking.length > 0 && <div className={classes.navSection}>Tracking</div>}
          {navTracking.map((n) => (
            <RouterNavLink key={n.to} to={n.to} end={n.end} onClick={close} className={navClass}>
              <n.icon size={19} stroke={1.7} />
              <span>{n.label}</span>
            </RouterNavLink>
          ))}

          {isAdmin && (
            <>
              <div className={classes.navSection}>Administration</div>
              {NAV_ADMIN.map((n) => (
                <RouterNavLink key={n.to} to={n.to} onClick={close} className={navClass}>
                  <n.icon size={19} stroke={1.7} />
                  <span>{n.label}</span>
                </RouterNavLink>
              ))}
            </>
          )}

          <div className={classes.userCard}>
            <Avatar radius="xl" size={40} variant="gradient" gradient={{ from: "abbott.4", to: "grape.5", deg: 60 }}>
              {initialsFromName(user.name)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text className={classes.userName} truncate>{user.name}</Text>
              <Group gap={3} wrap="nowrap">
                {roles.slice(0, 2).map((r) => (
                  <Badge key={r} size="xs" variant="light" color={ROLE_COLOR[r]}>{ROLE_LABEL[r]}</Badge>
                ))}
                {roles.length > 2 && <Badge size="xs" variant="light" color="gray">+{roles.length - 2}</Badge>}
              </Group>
            </div>
            <ActionIcon
              variant="subtle"
              size="md"
              onClick={() => { signOut(); window.location.hash = "#/login"; }}
              title="Sign out"
              aria-label="Sign out"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <IconLogout size={16} />
            </ActionIcon>
          </div>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <div className="page-fade" key={loc.pathname}>
          <ErrorBoundary key={loc.pathname}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

export type { Lang, TKey };
