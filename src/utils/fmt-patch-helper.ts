/**
 * This is a helper file to document the fmt library issue and solution.
 *
 * The issue:
 * When building the iOS app, the fmt library causes a compilation error:
 * "implicit instantiation of undefined template 'std::char_traits<fmt::internal::char8_type>'"
 *
 * The solution:
 * 1. We've updated the Podfile to:
 *    - Explicitly specify fmt version 6.2.1
 *    - Set modular_headers to true
 *    - Disable non-type template parameters with FMT_USE_NONTYPE_TEMPLATE_PARAMETERS=0
 *    - Set C++ standard to C++17
 *    - Disable C++ exceptions
 *
 * 2. If the build still fails, you can try the more advanced solution:
 *    - Run the patch-fmt-library-advanced.sh script
 *    - This script creates a replacement for the problematic code
 *
 * Usage:
 * 1. First try building with the updated Podfile:
 *    $ cd ios
 *    $ pod deintegrate
 *    $ pod install --repo-update
 *    $ cd ..
 *    $ eas build --platform ios --profile production
 *
 * 2. If that fails, use the advanced patch:
 *    $ chmod +x ios/patch-fmt-library-advanced.sh
 *    $ ./ios/patch-fmt-library-advanced.sh
 *    $ eas build --platform ios --profile production
 */

// This file is just for documentation purposes and doesn't contain actual code
export const FMT_LIBRARY_ISSUE = {
  description: "Compilation error with fmt library in iOS builds",
  error: "implicit instantiation of undefined template 'std::char_traits<fmt::internal::char8_type>'",
  solution: "Updated Podfile with fmt library fixes and created patch scripts",
}
