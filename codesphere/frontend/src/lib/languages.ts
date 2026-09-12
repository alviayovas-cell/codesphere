/** The set of languages students may submit in - mirrors
 * backend/app/core/languages.py. A curated "popular contest languages"
 * set (5), not Judge0's full 60+ catalog. */

export type LanguageId = 'c' | 'cpp' | 'java' | 'python3' | 'javascript'

export interface LanguageInfo {
  id: LanguageId
  label: string
  /** Monaco's built-in language id for syntax highlighting - NOT always
   * the same as `id` (Python's Monaco id is "python", not "python3"). */
  monacoId: string
  defaultTemplate: string
}

export const LANGUAGES: Record<LanguageId, LanguageInfo> = {
  c: {
    id: 'c',
    label: 'C',
    monacoId: 'c',
    defaultTemplate: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n',
  },
  cpp: {
    id: 'cpp',
    label: 'C++',
    monacoId: 'cpp',
    defaultTemplate: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n',
  },
  java: {
    id: 'java',
    label: 'Java',
    monacoId: 'java',
    // Judge0 writes the source to Main.java before compiling - the public
    // class must be named exactly "Main" or every submission fails to
    // compile regardless of the student's actual logic.
    defaultTemplate: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n',
  },
  python3: {
    id: 'python3',
    label: 'Python 3',
    monacoId: 'python',
    defaultTemplate: '',
  },
  javascript: {
    id: 'javascript',
    label: 'JavaScript (Node.js)',
    monacoId: 'javascript',
    defaultTemplate: '',
  },
}

export const DEFAULT_LANGUAGE: LanguageId = 'c'

export const LANGUAGE_LIST: LanguageInfo[] = Object.values(LANGUAGES)
