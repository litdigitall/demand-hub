/* ============================================================
   ErrorBoundary — garante que uma exceção de render em uma tela
   não derrube o app inteiro (sem mais "tela branca"). Mostra uma
   mensagem amigável e um botão para recarregar.
   ============================================================ */
import { Component, type ReactNode } from "react";
import { Button, Center, Code, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary capturó:", error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <Center mih="70vh" p="lg">
          <Stack align="center" gap="sm" maw={520}>
            <ThemeIcon size={64} radius="xl" color="orange" variant="light">
              <IconAlertTriangle size={32} />
            </ThemeIcon>
            <Text fw={700} fz="lg">
              Algo salió mal en esta pantalla
            </Text>
            <Text c="dimmed" ta="center" size="sm">
              El resto de la aplicación sigue funcionando. Puedes reintentar o volver al inicio.
            </Text>
            <Code block style={{ maxWidth: "100%", whiteSpace: "pre-wrap" }}>
              {this.state.error.message}
            </Code>
            <Button onClick={this.reset}>Reintentar</Button>
            <Button
              variant="subtle"
              onClick={() => {
                this.reset();
                window.location.hash = "#/";
              }}
            >
              Volver al inicio
            </Button>
          </Stack>
        </Center>
      );
    }
    return this.props.children;
  }
}
