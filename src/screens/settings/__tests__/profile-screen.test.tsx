import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { TextInput } from 'react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';

// The first ReactTestRenderer.create pays the full module-graph evaluation (~15s on Windows).
jest.setTimeout(30000);

jest.mock('@/components/ui/bottom-sheet', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const AppBottomSheet = ReactModule.forwardRef(
    (
      { children }: { children?: React.ReactNode },
      _ref: unknown,
    ): React.ReactElement => <View>{children}</View>,
  );
  return { __esModule: true, default: AppBottomSheet };
});

jest.mock('@/components/ui/image-cropper-modal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/ui/user-profile-status', () => ({
  UserProfileStatus: () => null,
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('@/store/useDataContext', () => ({
  useDataContext: () => ({
    state: {
      user: {
        fullname: 'jane doe',
        username: 'janed',
        status: '',
        email: 'jane@example.com',
        title: 'engineer',
        phone: '08012345678',
        online: true,
        default_avatar_url: 'https://example.com/default.png',
      },
      orgData: { name: 'Test Org' },
      callback: false,
      channelCallback: false,
    },
    dispatch: jest.fn(),
  }),
}));

const renderProfileScreen = async () => {
  const ProfileScreen = require('../profile-screen').default;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ThemeProvider>
        <ProfileScreen navigation={{ goBack: jest.fn() }} />
      </ThemeProvider>,
    );
  });
  return renderer;
};

const inputByPlaceholder = (renderer: ReactTestRenderer.ReactTestRenderer) => {
  const inputs = renderer.root.findAllByType(TextInput);
  return (placeholder: string) => {
    const input = inputs.find(node => node.props.placeholder === placeholder);
    if (!input) {
      throw new Error(`No TextInput with placeholder "${placeholder}"`);
    }
    return input.props;
  };
};

describe('ProfileScreen keyboard settings (issue #221)', () => {
  test('Name, Display Name and Title auto-capitalize words', async () => {
    const renderer = await renderProfileScreen();
    const byPlaceholder = inputByPlaceholder(renderer);

    expect(byPlaceholder('Your name').autoCapitalize).toBe('words');
    expect(byPlaceholder('Display name').autoCapitalize).toBe('words');
    expect(byPlaceholder('Your title').autoCapitalize).toBe('words');
  });

  test('Phone opens the phone-pad keyboard', async () => {
    const renderer = await renderProfileScreen();
    const byPlaceholder = inputByPlaceholder(renderer);

    expect(byPlaceholder('Your phone number').keyboardType).toBe('phone-pad');
  });

  test('Email keeps the shared default and stays disabled', async () => {
    const renderer = await renderProfileScreen();
    const byPlaceholder = inputByPlaceholder(renderer);

    const email = byPlaceholder('Your email');
    expect(email.autoCapitalize).toBe('none');
    expect(email.keyboardType).toBe('default');
    expect(email.editable).toBe(false);
  });

  test('Existing values, text fields and keyboard defaults are preserved', async () => {
    const renderer = await renderProfileScreen();
    const byPlaceholder = inputByPlaceholder(renderer);

    expect(byPlaceholder('Your name').value).toBe('jane doe');
    expect(byPlaceholder('Display name').value).toBe('janed');
    expect(byPlaceholder('Your title').value).toBe('engineer');
    expect(byPlaceholder('Your phone number').value).toBe('08012345678');

    const textFields = [
      byPlaceholder('Your name'),
      byPlaceholder('Display name'),
      byPlaceholder('Your title'),
    ];
    for (const field of textFields) {
      expect(field.keyboardType).toBe('default');
    }
  });
});
