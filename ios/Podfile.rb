# This helper function provides the folly compiler flags to the pods that need them
def get_folly_config
  return {
    :compiler_flags => "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DRNVERSION=0.73"
  }
end
